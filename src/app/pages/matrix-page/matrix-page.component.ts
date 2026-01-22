import { Component, signal } from '@angular/core';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { NgStyle } from '@angular/common';

import { QUADRANTS, QuadrantId, Task } from '../../models/task.models';
import { TaskStoreService } from '../../services/task-store.service';
import { QuadrantComponent } from './quadrant/quadrant.component';
import { TaskEditorComponent } from './task-editor/task-editor.component';

type ListsMap = Record<QuadrantId, Task[]>;

/**
 * Matrix page:
 * - Maintains stable per-quadrant arrays for CDK drag/drop (critical)
 * - Drives "expand quadrant" layout (grid resizing + collapsed quadrants)
 * - Hosts the Task Editor modal
 */
@Component({
  standalone: true,
  selector: 'app-matrix-page',
  imports: [DragDropModule, NgStyle, QuadrantComponent, TaskEditorComponent],
  template: `
    <div class="page">
      <!-- MATRIX FIRST -->
      <section class="matrix">
        <div class="grid" [ngStyle]="gridStyle()">
          @for (q of quadrants; track q.id) {
            <app-quadrant
              [quadrantId]="q.id"
              [title]="q.title"
              [subtitle]="q.subtitle"
              [bg]="q.bg"
              [border]="q.border"
              [expandedMatrixId]="expandedMatrixId()"
              [tasks]="list(q.id)"
              (newTask)="openCreate(q.id)"
              (toggleMatrixExpand)="toggleMatrixExpand($event)"
              (taskChanged)="onTaskChanged($event)"
              (taskDeleted)="store.deleteTask($event)"
              (drop)="onDrop($event)"
            />
          }
        </div>
      </section>

      <!-- UNCATEGORIZED AT BOTTOM -->
      <section class="inbox">
        <div class="inbox-header">
          <div>
            <div class="inbox-title">Uncategorized</div>
            <div class="inbox-subtitle">Where tasks go to avoid being judged.</div>
          </div>

          <button
            class="icon-btn"
            (click)="openCreate('UNCATEGORIZED')"
            title="New uncategorized task"
          >
            +
          </button>
        </div>

        <app-quadrant
          [isInbox]="true"
          [quadrantId]="'UNCATEGORIZED'"
          [title]="'Uncategorized tasks'"
          [subtitle]="'Drag into a quadrant when you stop procrastinating'"
          [bg]="'rgba(255,255,255,0.04)'"
          [border]="'rgba(255,255,255,0.14)'"
          [expandedMatrixId]="expandedMatrixId()"
          [tasks]="list('UNCATEGORIZED')"
          (newTask)="openCreate('UNCATEGORIZED')"
          (toggleMatrixExpand)="toggleMatrixExpand($event)"
          (taskChanged)="onTaskChanged($event)"
          (taskDeleted)="store.deleteTask($event)"
          (drop)="onDrop($event)"
        />
      </section>

      <app-task-editor
        [open]="editorOpen()"
        [quadrant]="editorQuadrant()"
        (close)="editorOpen.set(false)"
        (create)="createTask($event)"
      />
    </div>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 16px;
      }

      .icon-btn {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 14px;
        font-size: 22px;
        line-height: 1;
      }

      /* MATRIX:
       Give it a predictable height so quadrants can scroll internally.
       Adjust the min() values if you want it taller/shorter. */
      .matrix {
        height: min(72vh, 760px);
        min-height: 520px;
      }

      /* Grid must allow children to shrink; otherwise the content forces expansion. */
      .grid {
        height: 100%;
        display: grid;
        gap: 14px;
        grid-template-areas:
          'DO_NOW DO_LATER'
          'DELEGATE ELIMINATE';
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
        transition:
          grid-template-columns 260ms ease,
          grid-template-rows 260ms ease;
      }

      /* Tablet view stays 2x2 */
      @media (max-width: 900px) {
        .grid {
          gap: 10px;
        }
        .matrix {
          min-height: 460px;
        }
      }

      .inbox-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .inbox-title {
        font-weight: 700;
      }
      .inbox-subtitle {
        font-size: 12px;
        opacity: 0.75;
        margin-top: 2px;
      }
    `,
  ],
})
export class MatrixPageComponent {
  quadrants = QUADRANTS;

  // Which quadrant dominates the matrix (null means normal 2x2)
  expandedMatrixId = signal<Exclude<QuadrantId, 'UNCATEGORIZED'> | null>(null);

  // Task editor modal state
  editorOpen = signal(false);
  editorQuadrant = signal<QuadrantId>('UNCATEGORIZED');

  // Stable per-quadrant lists (critical for CDK drag/drop)
  private lists = signal<ListsMap>({
    DO_NOW: [],
    DO_LATER: [],
    DELEGATE: [],
    ELIMINATE: [],
    UNCATEGORIZED: [],
  });

  constructor(public store: TaskStoreService) {
    this.store.tasks$.subscribe((tasks) => this.rebuildLists(tasks));
  }

  /**
   * Returns the stable array instance for CDK to mutate during drag/drop.
   * Do not inline filter() into templates for drag/drop lists.
   */
  list(id: QuadrantId): Task[] {
    return this.lists()[id];
  }

  toggleMatrixExpand(id: Exclude<QuadrantId, 'UNCATEGORIZED'>): void {
    this.expandedMatrixId.set(this.expandedMatrixId() === id ? null : id);
  }

  openCreate(q: QuadrantId): void {
    this.editorQuadrant.set(q);
    this.editorOpen.set(true);
  }

  createTask(payload: {
    title: string;
    quadrant: QuadrantId;
    dueDate?: string;
    description?: string;
    tags: string[];
  }): void {
    this.store.createTask(payload);
    this.editorOpen.set(false);
  }

  onTaskChanged(ev: { id: string; patch: Partial<Task> }): void {
    this.store.updateTask(ev.id, ev.patch);
  }

  /**
   * Drag & drop handler:
   * - Same list => reorder + persist order
   * - Different list => transfer + update moved task quadrant + persist both orders
   */
  onDrop(ev: CdkDragDrop<Task[]>): void {
    const prevList = ev.previousContainer.data;
    const nextList = ev.container.data;

    const prevQuadrant = this.getQuadrantFromDropId(ev.previousContainer.id);
    const nextQuadrant = this.getQuadrantFromDropId(ev.container.id);

    if (ev.previousContainer === ev.container) {
      moveItemInArray(nextList, ev.previousIndex, ev.currentIndex);
      this.store.setOrder(
        nextQuadrant,
        nextList.map((t) => t.id),
      );
      return;
    }

    transferArrayItem(prevList, nextList, ev.previousIndex, ev.currentIndex);

    const moved = nextList[ev.currentIndex];
    this.store.updateTask(moved.id, { quadrant: nextQuadrant });

    this.store.setOrder(
      prevQuadrant,
      prevList.map((t) => t.id),
    );
    this.store.setOrder(
      nextQuadrant,
      nextList.map((t) => t.id),
    );
  }

  /**
   * Grid resizing for "expanded quadrant" effect.
   * - We don't scale content; we resize the grid tracks.
   * - Collapsed quadrants become narrow strips (buttons-only handled in QuadrantComponent).
   */
  gridStyle(): Record<string, string> {
    const expanded = this.expandedMatrixId();
    if (!expanded) {
      return {
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
      };
    }

    const strip = '86px';
    const big = 'minmax(0, 1fr)';

    const isLeft = expanded === 'DO_NOW' || expanded === 'DELEGATE';
    const isTop = expanded === 'DO_NOW' || expanded === 'DO_LATER';

    return {
      gridTemplateColumns: isLeft ? `${big} ${strip}` : `${strip} ${big}`,
      gridTemplateRows: isTop ? `${big} ${strip}` : `${strip} ${big}`,
    };
  }

  private rebuildLists(tasks: Task[]): void {
    // Keep order stable in each quadrant by createdAt (or you can add an explicit order field later).
    const next: ListsMap = {
      DO_NOW: [],
      DO_LATER: [],
      DELEGATE: [],
      ELIMINATE: [],
      UNCATEGORIZED: [],
    };
    for (const t of tasks) next[t.quadrant].push(t);

    // Optional: consistent default ordering
    for (const key of Object.keys(next) as QuadrantId[]) {
      next[key] = next[key].slice(); // stable array, but rebuilt on store update
    }

    this.lists.set(next);
  }

  private getQuadrantFromDropId(dropId: string): QuadrantId {
    const known: QuadrantId[] = ['DO_NOW', 'DO_LATER', 'DELEGATE', 'ELIMINATE', 'UNCATEGORIZED'];
    return known.includes(dropId as QuadrantId) ? (dropId as QuadrantId) : 'UNCATEGORIZED';
  }
}
