import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { DragDropModule, CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';

import { QuadrantId, Task } from '../../../models/task.models';
import { TaskCardComponent } from '../task-card/task-card.component';
import { KEYBOARD } from '../../../constants/constants';

/**
 * Quadrant Component
 *
 * Renders a single quadrant in the Eisenhower matrix or an inbox section.
 * Supports:
 * - Drag-and-drop task reordering and movement between quadrants
 * - Expansion/collapse behavior with smooth animations
 * - Empty state messaging
 * - Keyboard navigation (Escape to close when expanded)
 * - Full accessibility support (ARIA attributes, focus management)
 *
 * @example
 * ```html
 * <app-quadrant
 *   quadrantId="DO_NOW"
 *   title="Urgent & Important"
 *   subtitle="Do now"
 *   [tasks]="tasks"
 *   [expandedMatrixId]="expandedId"
 *   (toggleMatrixExpand)="onExpand($event)"
 * />
 * ```
 */
@Component({
  standalone: true,
  selector: 'app-quadrant',
  imports: [DragDropModule, CdkDropList, TaskCardComponent, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="quad"
      [class.quad--dominant]="isDominant"
      [class.quad--shrunk]="isShrunk"
      [class.quad--inbox]="isInbox"
      [style.background]="bg"
      [style.borderColor]="border"
      [style.gridArea]="quadrantId"
      [attr.role]="'region'"
      [attr.aria-label]="getAriaLabel()"
      [attr.aria-expanded]="isDominant"
    >
      <header class="quad-header">
        <div class="quad-meta">
          <div class="quad-title">{{ title }}</div>
          <div class="quad-subtitle">{{ subtitle }}</div>
        </div>

        <div class="quad-actions">
          <!-- Hide + in shrunk state (the sketch shows expand-only controls) -->
          @if (allowCreate) {
            <button
              class="material-symbols-rounded icon-btn"
              (click)="newTask.emit()"
              type="button"
              [attr.aria-label]="'Add task to ' + title"
              title="New task"
              [class.hide-when-shrunk]="isShrunk"
            >
              add
            </button>
          }
          <!-- Inbox doesn't participate in matrix expansion -->
          @if (!isInbox && quadrantId !== 'UNCATEGORIZED') {
            <div class="expand-btn-wrap">
              <button
                class="material-symbols-rounded expand-btn icon-btn"
                (click)="onToggleMatrixExpand()"
                type="button"
                [attr.aria-label]="isDominant ? 'Collapse ' + title : 'Expand ' + title"
                [attr.aria-pressed]="isDominant"
                [title]="isDominant ? 'Collapse' : 'Expand'"
                (keydown.escape)="isDominant && onToggleMatrixExpand()"
              >
                {{ isDominant ? 'close_fullscreen' : 'open_in_full' }}
              </button>
            </div>
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
        align-items: center;
        display: flex;
        gap: 8px;
        height: 40px;
      }

      .expand-btn-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
      }

      .expand-btn {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
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
        display: none;
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

      .quad--dominant {
        filter: saturate(1.02);
      }

      .quad--shrunk {
        opacity: 1;
        filter: none;
      }

      .quad--shrunk .quad-header {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .quad--shrunk .quad-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
        height: 100%;
      }

      .quad--shrunk .expand-btn-wrap {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .quad--shrunk .quad-meta,
      .quad--shrunk .task-list,
      .quad--shrunk .hide-when-shrunk {
        opacity: 0;
        pointer-events: none;
      }

      /* Fade overlay (so it feels "pushed out" rather than "deleted") */
      .quad--shrunk::after {
        content: '';
        position: absolute;
        inset: 0;
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

      .quad--inbox {
        --inbox-card-h: 92px;
        --inbox-gap: 10px;
      }

      .quad--inbox .task-list {
        flex: 0 1 auto;
        max-height: calc((var(--inbox-card-h) * 3) + (var(--inbox-gap) * 2));
      }
    `,
  ],
})
export class QuadrantComponent {
  /** Unique identifier for this quadrant */
  @Input({ required: true }) quadrantId!: QuadrantId;

  /** Display title of the quadrant */
  @Input({ required: true }) title!: string;

  /** Subtitle/description of the quadrant */
  @Input({ required: true }) subtitle!: string;

  /** Background color (CSS color string) */
  @Input({ required: true }) bg!: string;

  /** Border color (CSS color string) */
  @Input({ required: true }) border!: string;

  /** Array of tasks in this quadrant */
  @Input({ required: true }) tasks: Task[] = [];

  /** Currently expanded quadrant ID (controls shrink/dominant states) */
  @Input() expandedMatrixId: Exclude<QuadrantId, 'UNCATEGORIZED'> | null = null;

  /** Whether this quadrant is an inbox (UNCATEGORIZED or COMPLETED) */
  @Input() isInbox = false;

  /** List of drop zone IDs that this quadrant connects to */
  @Input() connectedTo: string[] = [];

  /** Whether users can create new tasks in this quadrant */
  @Input() allowCreate = true;

  /** Emitted when user clicks the create new task button */
  @Output() newTask = new EventEmitter<void>();

  /** Emitted when user toggles quadrant expansion */
  @Output() toggleMatrixExpand = new EventEmitter<Exclude<QuadrantId, 'UNCATEGORIZED'>>();

  /** Emitted when a task is modified */
  @Output() taskChanged = new EventEmitter<{ id: string; patch: Partial<Task> }>();

  /** Emitted when a task is deleted */
  @Output() taskDeleted = new EventEmitter<string>();

  /** Emitted when a task is dropped (drag-drop) */
  @Output() drop = new EventEmitter<CdkDragDrop<Task[]>>();

  /** Emitted when user requests to open date picker for a task */
  @Output() datePickerRequested = new EventEmitter<{
    taskId: string;
    rect: DOMRect;
    anchor: 'date' | 'switch';
  }>();

  /**
   * Whether this quadrant is currently expanded (dominant)
   * @returns true if this quadrant is the expanded one
   */
  get isDominant(): boolean {
    return !this.isInbox && this.expandedMatrixId === this.quadrantId;
  }

  /**
   * Whether this quadrant is currently shrunk
   * Shrunk means another quadrant is expanded
   * @returns true if another quadrant is expanded
   */
  get isShrunk(): boolean {
    return (
      !this.isInbox && this.expandedMatrixId !== null && this.expandedMatrixId !== this.quadrantId
    );
  }

  /**
   * Get ARIA-friendly label for the quadrant section
   * Used for screen readers and accessibility
   * @returns A descriptive label
   */
  getAriaLabel(): string {
    const state = this.isDominant ? 'expanded' : this.isShrunk ? 'collapsed' : 'normal';
    const taskCount = this.tasks.length;
    const taskText = taskCount === 1 ? '1 task' : `${taskCount} tasks`;
    return `${this.title}, ${state}, ${taskText}`;
  }

  /**
   * Handle expand/collapse toggle
   * Prevents toggle on inbox quadrants
   */
  onToggleMatrixExpand(): void {
    if (this.isInbox || this.quadrantId === 'UNCATEGORIZED') return;
    this.toggleMatrixExpand.emit(this.quadrantId as any);
  }
}
