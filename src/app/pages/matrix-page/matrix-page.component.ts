import { Component, HostListener, signal } from '@angular/core';
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
import { DatePickerComponent } from '../../components/date-picker/date-picker.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UiEventsService, MatrixTarget } from '../../services/ui-events.service';

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
  imports: [DragDropModule, NgStyle, QuadrantComponent, TaskEditorComponent, DatePickerComponent],
  template: `
    <div class="page">
      <!-- MATRIX FIRST -->
      <section class="matrix">
        <div class="matrix-grid-wrap">
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
                [connectedTo]="dropListIds"
                (newTask)="openCreate(q.id)"
                (toggleMatrixExpand)="toggleMatrixExpand($event)"
                (taskChanged)="onTaskChanged($event)"
                (taskDeleted)="store.deleteTask($event)"
                (datePickerRequested)="openDatePickerForTask($event)"
                (drop)="onDrop($event)"
              />
            }
          </div>
        </div>
      </section>

      <!-- UNCATEGORIZED -->
      <section class="inbox">
        <app-quadrant
          [isInbox]="true"
          [quadrantId]="'UNCATEGORIZED'"
          [title]="'Uncategorized tasks'"
          [subtitle]="'Drag into a quadrant when you stop procrastinating'"
          [bg]="'rgba(255,255,255,0.04)'"
          [border]="'rgba(255,255,255,0.14)'"
          [expandedMatrixId]="expandedMatrixId()"
          [tasks]="list('UNCATEGORIZED')"
          [connectedTo]="dropListIds"
          (newTask)="openCreate('UNCATEGORIZED')"
          (toggleMatrixExpand)="toggleMatrixExpand($event)"
          (taskChanged)="onTaskChanged($event)"
          (taskDeleted)="store.deleteTask($event)"
          (datePickerRequested)="openDatePickerForTask($event)"
          (drop)="onDrop($event)"
        />
      </section>

      <app-task-editor
        [open]="editorOpen()"
        [quadrant]="editorQuadrant()"
        (close)="editorOpen.set(false)"
        (create)="createTask($event)"
      />

      @if (datePickerOpen()) {
        <div class="date-popover-backdrop" (pointerdown)="closeDatePicker()"></div>

        <app-date-picker
          class="date-popover"
          [style.top.px]="datePickerTop()"
          [style.left.px]="datePickerLeft()"
          [style.transform]="datePickerTransform()"
          [mode]="'popover'"
          [value]="datePickerValue()"
          (selected)="onDatePicked($event)"
          (close)="closeDatePicker()"
        />
      }
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
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
        flex: 0 0 auto;
        padding: 16px 16px 10px;
      }

      .matrix-grid-wrap {
        height: clamp(560px, 72vh, 660px);
      }

      /* Grid must allow children to shrink; otherwise the content forces expansion. */
      .grid {
        height: 100%;
        display: grid;

        /* Use a variable so TS + CSS stay consistent */
        --grid-gap: 14px;
        --strip: 86px;

        gap: var(--grid-gap);

        /* Tracks are length-based so they animate reliably */
        grid-template-columns: var(--col1) var(--col2);
        grid-template-rows: var(--row1) var(--row2);

        align-items: stretch;

        /* This is the animation you expected */
        transition:
          grid-template-columns 420ms cubic-bezier(0.2, 0.85, 0.2, 1),
          grid-template-rows 420ms cubic-bezier(0.2, 0.85, 0.2, 1);

        /* Guardrail: clip any overflow so nothing “invades” other rows */
        overflow: visible;
      }

      /* Ensure custom elements behave as real grid items */
      .grid > app-quadrant {
        height: 100%;
        min-height: 0;
        min-width: 0;
      }

      /* Tablet view stays 2x2 */
      @media (max-width: 900px) {
        .grid {
          --grid-gap: 10px;
        }
        .matrix {
          min-height: 460px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .grid {
          transition: none;
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

      .date-popover {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
      }

      .date-popover-backdrop {
        position: fixed;
        inset: 0;
        z-index: 999; /* must be BELOW the popover (1000) */
        background: transparent; /* invisible but clickable */
      }
    `,
  ],
})
export class MatrixPageComponent {
  quadrants = QUADRANTS;

  // Which quadrant dominates the matrix (null means normal 2x2)
  expandedMatrixId = signal<Exclude<QuadrantId, 'UNCATEGORIZED'> | null>(null);

  readonly dropListIds: string[] = [...this.quadrants.map((q) => q.id), 'UNCATEGORIZED'];
  // Task editor modal state
  editorOpen = signal(false);
  editorQuadrant = signal<QuadrantId>('UNCATEGORIZED');

  datePickerOpen = signal(false);
  datePickerTaskId = signal<string | null>(null);
  datePickerTop = signal(0);
  datePickerLeft = signal(0);
  datePickerTransform = signal('translateX(0)');
  datePickerAnchor = signal<'date' | 'switch'>('date');
  private datePickerAnchorRect: DOMRect | null = null;

  // Stable per-quadrant lists (critical for CDK drag/drop)
  private lists = signal<ListsMap>({
    DO_NOW: [],
    DO_LATER: [],
    DELEGATE: [],
    ELIMINATE: [],
    UNCATEGORIZED: [],
  });

  constructor(
    public store: TaskStoreService,
    private ui: UiEventsService,
  ) {
    this.store.tasks$.subscribe((tasks) => this.rebuildLists(tasks));
    this.ui.expandMatrix$
      .pipe(takeUntilDestroyed())
      .subscribe((target) => this.expandFromMenu(target));
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

    const half = 'calc((100% - var(--grid-gap)) / 2)';
    const strip = 'var(--strip)';
    const big = 'calc(100% - var(--strip) - var(--grid-gap))';

    if (!expanded) {
      return {
        '--col1': half,
        '--col2': half,
        '--row1': half,
        '--row2': half,
      };
    }

    const isLeft = expanded === 'DO_NOW' || expanded === 'DELEGATE';
    const isTop = expanded === 'DO_NOW' || expanded === 'DO_LATER';

    return {
      '--col1': isLeft ? big : strip,
      '--col2': isLeft ? strip : big,
      '--row1': isTop ? big : strip,
      '--row2': isTop ? strip : big,
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

  openDatePickerForTask(payload: {
    taskId: string;
    rect: DOMRect;
    anchor: 'date' | 'switch';
  }): void {
    this.datePickerTaskId.set(payload.taskId);
    this.datePickerAnchorRect = payload.rect;
    this.datePickerAnchor.set(payload.anchor);
    this.positionDatePicker(payload.anchor);
    this.datePickerOpen.set(true);
  }

  closeDatePicker(): void {
    this.datePickerOpen.set(false);
    this.datePickerTaskId.set(null);
    this.datePickerAnchorRect = null;
  }

  datePickerValue(): string | undefined {
    const id = this.datePickerTaskId();
    if (!id) return undefined;
    return this.store.snapshot.find((t) => t.id === id)?.dueDate;
  }

  onDatePicked(iso: string): void {
    const id = this.datePickerTaskId();
    if (!id) return;
    this.store.updateTask(id, { dueDate: iso });
    this.closeDatePicker();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.datePickerOpen()) this.positionDatePicker(this.datePickerAnchor());
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.datePickerOpen()) this.positionDatePicker(this.datePickerAnchor());
  }

  private positionDatePicker(anchor: 'date' | 'switch' = 'date'): void {
    if (!this.datePickerAnchorRect) return;

    const rect = this.datePickerAnchorRect;
    const isRight = anchor === 'switch';
    const gap = 8;
    const estimatedWidth = 320;
    const estimatedHeight = 360;

    let top = rect.bottom + gap;
    let left = isRight ? rect.right : rect.left;
    let transform = isRight ? 'translateX(-100%)' : 'translateX(0)';

    if (!isRight && left + estimatedWidth > window.innerWidth - gap) {
      left = Math.max(gap, window.innerWidth - estimatedWidth - gap);
    }
    if (isRight && left - estimatedWidth < gap) {
      left = Math.min(window.innerWidth - gap, rect.left);
      transform = 'translateX(0)';
    }
    if (top + estimatedHeight > window.innerHeight - gap) {
      top = Math.max(gap, rect.top - gap - estimatedHeight);
    }

    this.datePickerTop.set(Math.max(gap, top));
    this.datePickerLeft.set(Math.max(gap, Math.min(left, window.innerWidth - gap)));
    this.datePickerTransform.set(transform);
  }

  private expandFromMenu(target: MatrixTarget): void {
    // Completed tasks panel doesn't exist yet; handle later.
    if (target === 'COMPLETED') {
      // For now: expand nothing or open a toast later.
      return;
    }

    // UNCATEGORIZED cannot be expanded
    if (target === 'UNCATEGORIZED') {
      return;
    }

    // If already expanded, collapse; otherwise expand.
    // Use your existing state + animation path.
    const current = this.expandedMatrixId();
    this.expandedMatrixId.set(current === target ? null : target);
  }
}
