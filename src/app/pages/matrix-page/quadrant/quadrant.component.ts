import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DragDropModule, CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';

import { QuadrantId, Task } from '../../../models/task.models';
import { TaskCardComponent } from '../task-card/task-card.component';

/**
 * Quadrant container:
 * - Hosts header (+ new task, expand/collapse)
 * - Hosts scrollable task list (cdkDropList)
 * - In "shrunk" state: only expand button remains visible, rest is clipped + faded
 */
@Component({
  standalone: true,
  selector: 'app-quadrant',
  imports: [DragDropModule, CdkDropList, TaskCardComponent],
  template: `
    <section
      class="quad"
      [class.quad--dominant]="isDominant"
      [class.quad--shrunk]="isShrunk"
      [class.quad--inbox]="isInbox"
      [style.background]="bg"
      [style.borderColor]="border"
      [style.gridArea]="quadrantId"
    >
      <header class="quad-header">
        <div class="quad-meta">
          <div class="quad-title">{{ title }}</div>
          <div class="quad-subtitle">{{ subtitle }}</div>
        </div>

        <div class="quad-actions">
          <!-- Hide + in shrunk state (the sketch shows expand-only controls) -->
          <button
            class="material-symbols-rounded"
            (click)="newTask.emit()"
            title="New task"
            [class.hide-when-shrunk]="isShrunk"
          >
            add
          </button>

          <!-- Inbox doesn't participate in matrix expansion -->
          @if (!isInbox && quadrantId !== 'UNCATEGORIZED') {
            <button
              class="material-symbols-rounded"
              (click)="onToggleMatrixExpand()"
              [title]="isDominant ? 'Collapse' : 'Expand'"
            >
              {{ isDominant ? 'close_fullscreen' : 'open_in_full' }}
            </button>
          }
        </div>
      </header>

      <div
        class="task-list"
        cdkDropList
        [id]="quadrantId"
        [cdkDropListData]="tasks"
        [cdkDropListConnectedTo]="connectedTo"
        (cdkDropListDropped)="drop.emit($event)"
      >
        @for (t of tasks; track t.id) {
          <app-task-card
            class="task-card"
            [task]="t"
            [accent]="border"
            (changed)="taskChanged.emit($event)"
            (datePickerRequested)="datePickerRequested.emit($event)"
          />
        }

        @if (tasks.length === 0 && !isShrunk) {
          <div class="empty">
            <div class="empty-title">No tasks</div>
            <div class="empty-sub">Must be nice.</div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0; /* critical: allows shrinking inside grid */
      }

      .quad {
        position: relative;
        border: 2px solid;
        border-radius: 18px;
        box-sizing: border-box;
        position: relative;
        padding: 12px;
        display: flex;
        flex-direction: column;
        height: 100%;
        z-index: 0;

        /* Critical: allow internal scrolling instead of growing the grid */
        min-height: 0;
        overflow: hidden;

        transition:
          opacity 220ms ease,
          filter 220ms ease;
      }

      .quad-header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      .quad-meta {
        min-width: 0;
        transition: opacity 200ms ease;
      }
      .quad-title {
        font-weight: 800;
      }
      .quad-subtitle {
        font-size: 12px;
        opacity: 0.75;
        margin-top: 2px;
      }

      .quad-actions {
        display: flex;
        gap: 8px;
      }
      .icon-btn {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 14px;
        font-size: 22px;
        line-height: 1;
        display: grid;
        place-items: center;
      }

      .hide-when-shrunk {
        transition: opacity 180ms ease;
      }

      .task-card {
        display: block;
      }

      .task-list {
        align-content: start;
        margin-top: 10px;
        display: grid;
        gap: 10px;
        grid-auto-rows: max-content;
        /* Scroll region */
        flex: 1;
        min-height: 0; /* critical in flex containers */
        overflow: auto;
        padding-right: 4px;

        transition: opacity 300ms ease;
      }

      .empty {
        border-radius: 14px;
        padding: 14px;
        border: 1px dashed rgba(255, 255, 255, 0.22);
        opacity: 0.8;
      }
      .empty-title {
        font-weight: 700;
      }
      .empty-sub {
        font-size: 12px;
        opacity: 0.8;
        margin-top: 2px;
      }

      /* Expanded quadrant: normal content, just more space from the grid */
      .quad--dominant {
        filter: saturate(1.02);
      }

      /* Shrunk quadrants:
       - Only show expand button
       - Clip (no scaling)
       - Fade out remaining content */
      .quad--shrunk {
        opacity: 0.95;
        filter: saturate(0.85);
      }

      .quad--shrunk .quad-meta,
      .quad--shrunk .task-list,
      .quad--shrunk .hide-when-shrunk {
        opacity: 0;
        pointer-events: none;
      }

      /* Keep expand button visible and anchored */
      .quad--shrunk .expand-btn {
        position: absolute;
        right: 10px;
        top: 10px;
        z-index: 2;
      }

      /* Fade overlay (so it feels "pushed out" rather than "deleted") */
      .quad--shrunk::after {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(120px 120px at 85% 15%, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0) 60%),
          linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.25));
        pointer-events: none;
        opacity: 1;
        transition: opacity 220ms ease;
      }

      /* Inbox should never be forced into shrunk state */
      .quad--inbox.quad--shrunk {
        opacity: 1;
        filter: none;
      }
      .quad--inbox.quad--shrunk .quad-meta,
      .quad--inbox.quad--shrunk .task-list,
      .quad--inbox.quad--shrunk .hide-when-shrunk {
        opacity: 1;
        pointer-events: auto;
      }
      .quad--inbox.quad--shrunk::after {
        opacity: 0;
      }
    `,
  ],
})
export class QuadrantComponent {
  @Input({ required: true }) quadrantId!: QuadrantId;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input({ required: true }) bg!: string;
  @Input({ required: true }) border!: string;
  @Input({ required: true }) tasks: Task[] = [];
  @Input() expandedMatrixId: Exclude<QuadrantId, 'UNCATEGORIZED'> | null = null;
  @Input() isInbox = false;
  @Input() connectedTo: string[] = [];

  @Output() newTask = new EventEmitter<void>();
  @Output() toggleMatrixExpand = new EventEmitter<Exclude<QuadrantId, 'UNCATEGORIZED'>>();
  @Output() taskChanged = new EventEmitter<{ id: string; patch: Partial<Task> }>();
  @Output() taskDeleted = new EventEmitter<string>();
  @Output() drop = new EventEmitter<CdkDragDrop<Task[]>>();
  @Output() datePickerRequested = new EventEmitter<{
    taskId: string;
    rect: DOMRect;
    anchor: 'date' | 'switch';
  }>();

  get isDominant(): boolean {
    return !this.isInbox && this.expandedMatrixId === this.quadrantId;
  }

  get isShrunk(): boolean {
    return (
      !this.isInbox && this.expandedMatrixId !== null && this.expandedMatrixId !== this.quadrantId
    );
  }

  onToggleMatrixExpand(): void {
    if (this.isInbox || this.quadrantId === 'UNCATEGORIZED') return;
    this.toggleMatrixExpand.emit(this.quadrantId);
  }
}
