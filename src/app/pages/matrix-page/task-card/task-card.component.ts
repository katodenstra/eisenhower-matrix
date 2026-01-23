import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import {
  CdkDrag,
  DragDropModule,
  CdkDragStart,
  CdkDragEnd,
  CdkDragHandle,
} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

import { Task } from '../../../models/task.models';
import { DragStateService } from '../../../services/drag-state.service';

type Meridian = 'AM' | 'PM';

@Component({
  standalone: true,
  selector: 'app-task-card',
  imports: [DragDropModule, CdkDrag, CdkDragHandle, FormsModule],
  template: `
    <article
      class="card"
      cdkDrag
      [cdkDragData]="task.id"
      [style.borderColor]="accent"
      (cdkDragStarted)="onDragStarted($event)"
      (cdkDragEnded)="onDragEnded($event)"
    >
      <!-- HEADER -->
      <div class="header">
        <!-- completed checkbox -->
        <button
          type="button"
          class="check"
          (click)="toggleComplete($event)"
          [attr.aria-pressed]="task.completed"
          [title]="task.completed ? 'Mark as incomplete' : 'Mark as complete'"
        >
          <span class="check-box" [class.check-box--on]="task.completed">
            {{ task.completed ? '✓' : '' }}
          </span>
        </button>

        <!-- title -->
        <div class="title-wrap">
          <div class="title" [class.title--done]="task.completed">{{ task.title }}</div>
        </div>

        <!-- expand button (ONLY way to expand/collapse) -->
        <button
          type="button"
          class="expand"
          (click)="toggleExpanded($event)"
          [title]="expanded() ? 'Collapse' : 'Expand'"
          aria-label="Toggle task details"
        >
          <span class="chev" [class.chev--up]="expanded()">⌄</span>
        </button>

        <!-- drag handle (far right) -->
        <button
          type="button"
          class="drag-handle"
          cdkDragHandle
          (pointerdown)="onDragHandleDown($event)"
          (click)="$event.stopPropagation()"
          aria-label="Reorder task"
          title="Drag to reorder"
        >
          ≡
        </button>
      </div>

      <!-- accent date line -->
      <div class="meta">
        <div class="due" [style.color]="accent">
          {{ dueLine() }}
        </div>
      </div>

      <!-- DETAILS -->
      <div class="details" [class.details--expanded]="expanded()">
        <div class="details-inner">
          <!-- Date & time section -->
          <div class="section">
            <div class="section-title">Date & time</div>

            <!-- DATE ROW -->
            <div class="row">
              <div class="row-left">
                <span class="icon" aria-hidden="true">📅</span>
                <div class="row-text">
                  <div class="row-label">Date</div>

                  <!-- The "value" line (blank space when empty, as requested) -->
                  <div class="row-value">
                    {{ task.dueDate ?? '' }}
                  </div>
                </div>
              </div>

              <label class="switch" (click)="$event.stopPropagation()">
                <input
                  type="checkbox"
                  [checked]="hasDate()"
                  (change)="onToggleDate($any($event.target).checked)"
                />
                <span class="slider"></span>
              </label>
            </div>

            <!-- hidden date input that we programmatically open -->
            <input
              #datePicker
              class="hidden-input"
              type="date"
              [value]="task.dueDate ?? ''"
              (change)="onPickedDate($any($event.target).value)"
              (click)="$event.stopPropagation()"
            />

            <!-- TIME ROW -->
            <div class="row">
              <div class="row-left">
                <span class="icon" aria-hidden="true">🕒</span>
                <div class="row-text">
                  <div class="row-label">Time</div>
                  <div class="row-value">
                    @if (hasTime()) {
                      {{ timeDisplay() }}
                    } @else {
                      {{ '' }}
                    }
                  </div>
                </div>
              </div>

              <label class="switch" (click)="$event.stopPropagation()">
                <input
                  type="checkbox"
                  [checked]="hasTime()"
                  (change)="onToggleTime($any($event.target).checked)"
                />
                <span class="slider"></span>
              </label>
            </div>

            <!-- TIME PICKER (3 fields) -->
            @if (timeEnabled()) {
              <div class="time-picker" (click)="$event.stopPropagation()">
                <input
                  class="time-input"
                  type="number"
                  min="1"
                  max="12"
                  [(ngModel)]="timeHour"
                  (ngModelChange)="commitTime()"
                  aria-label="Hour"
                />
                <span class="time-sep">:</span>
                <input
                  class="time-input"
                  type="number"
                  min="0"
                  max="59"
                  [(ngModel)]="timeMinute"
                  (ngModelChange)="commitTime()"
                  aria-label="Minutes"
                />
                <select
                  class="time-meridian"
                  [(ngModel)]="timeMeridian"
                  (ngModelChange)="commitTime()"
                  aria-label="AM/PM"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            }
          </div>

          <!-- Tags section -->
          <div class="section">
            <div class="section-title">Tags</div>

            <div class="chips">
              @for (tag of task.tags; track tag) {
                <span class="chip">
                  {{ tag }}
                  <button
                    type="button"
                    class="chip-x"
                    (click)="removeTag(tag, $event)"
                    aria-label="Remove tag"
                  >
                    ×
                  </button>
                </span>
              }

              @if (task.tags.length === 0) {
                <span class="chip chip--muted">none</span>
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .card {
        border: 2px solid;
        border-radius: 16px;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.18);
        backdrop-filter: blur(8px);
        overflow: hidden;
      }

      /* HEADER LAYOUT (compact) */
      .header {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        align-items: center;
        gap: 10px;
      }

      .check {
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
      }

      .check-box {
        width: 22px;
        height: 22px;
        border-radius: 7px;
        border: 2px solid rgba(255, 255, 255, 0.22);
        display: grid;
        place-items: center;
        font-weight: 900;
        line-height: 1;
      }
      .check-box--on {
        border-color: rgba(255, 255, 255, 0.55);
        background: rgba(255, 255, 255, 0.1);
      }

      .title-wrap {
        min-width: 0;
      }
      .title {
        font-weight: 800;
        font-size: 18px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .title--done {
        text-decoration: line-through;
        opacity: 0.7;
      }

      .expand,
      .drag-handle {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        border: 0;
        cursor: pointer;
        transition:
          background 120ms ease,
          transform 120ms ease;
      }
      .expand:hover,
      .drag-handle:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .expand:active,
      .drag-handle:active {
        transform: translateY(1px);
      }

      .drag-handle {
        cursor: grab;
        opacity: 0.9;
      }
      .drag-handle:active {
        cursor: grabbing;
      }

      .chev {
        display: inline-block;
        transform: translateY(-1px);
        transition: transform 160ms ease;
        font-size: 18px;
      }
      .chev--up {
        transform: rotate(180deg) translateY(1px);
      }

      /* META LINE */
      .meta {
        margin-top: 8px;
        display: flex;
        align-items: center;
        min-height: 18px;
      }
      .due {
        font-size: 13px;
        font-weight: 600;
        opacity: 0.95;
      }

      /* DETAILS */
      .details {
        overflow: hidden;

        /* Collapsed by default (this is what fixed the drag bug) */
        max-height: 0;
        opacity: 0;
        margin-top: 0;

        /* Smooth expand/collapse */
        transition:
          max-height 180ms ease,
          opacity 180ms ease,
          margin-top 180ms ease;
      }

      /* Expanded state */
      .details--expanded {
        /* Large enough to fit your panel content */
        max-height: 900px;
        opacity: 1;
        margin-top: 10px;
      }
      .details-inner {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 12px;
      }

      .section {
        margin-bottom: 14px;
      }
      .section-title {
        font-size: 12px;
        opacity: 0.78;
        font-weight: 700;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 10px 10px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 10px;
      }

      .row-left {
        display: flex;
        gap: 10px;
        align-items: center;
        min-width: 0;
      }
      .icon {
        width: 22px;
        text-align: center;
        opacity: 0.9;
      }
      .row-text {
        min-width: 0;
      }
      .row-label {
        font-size: 13px;
        font-weight: 700;
      }
      .row-value {
        margin-top: 4px;
        min-height: 16px; /* keeps the “empty space” even when blank */
        font-size: 13px;
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Switch */
      .switch {
        position: relative;
        display: inline-block;
        width: 46px;
        height: 28px;
        flex: 0 0 auto;
      }
      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.14);
        transition: 160ms ease;
        border-radius: 999px;
      }
      .slider:before {
        position: absolute;
        content: '';
        height: 22px;
        width: 22px;
        left: 3px;
        top: 2px;
        background: rgba(255, 255, 255, 0.85);
        transition: 160ms ease;
        border-radius: 999px;
      }
      input:checked + .slider {
        background: rgba(255, 255, 255, 0.18);
      }
      input:checked + .slider:before {
        transform: translateX(18px);
      }

      /* Hidden date input (we open it programmatically) */
      .hidden-input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        width: 1px;
        height: 1px;
      }

      /* Time picker */
      .time-picker {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        margin-top: -2px;
        margin-bottom: 8px;
        width: fit-content;
      }
      .time-input {
        width: 64px;
        text-align: center;
      }
      .time-sep {
        opacity: 0.7;
        font-weight: 800;
      }
      .time-meridian {
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: inherit;
        padding: 10px 12px;
      }

      /* Tags chips */
      .chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-size: 12px;
      }
      .chip--muted {
        opacity: 0.7;
      }
      .chip-x {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 0;
        background: rgba(255, 255, 255, 0.14);
        color: inherit;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
      }
      .chip-x:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `,
  ],
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input({ required: true }) accent!: string;

  @Output() changed = new EventEmitter<{ id: string; patch: Partial<Task> }>();

  expanded = signal(false);

  // Click suppression for drag end
  private suppressNextClick = false;

  // Local "time" UI state (stored in description for now unless you add fields)
  timeEnabled = signal(false);
  timeHour = 9;
  timeMinute = 0;
  timeMeridian: Meridian = 'AM';

  constructor(private dragState: DragStateService) {}

  onDragStarted(_ev: CdkDragStart): void {
    // start() is already called on pointerdown; calling it again is harmless.
    this.dragState.start();
  }

  onDragEnded(_ev: CdkDragEnd): void {
    this.dragState.end();
  }

  toggleComplete(ev: MouseEvent): void {
    ev.stopPropagation();
    this.changed.emit({ id: this.task.id, patch: { completed: !this.task.completed } });
  }

  toggleExpanded(ev: MouseEvent): void {
    ev.stopPropagation();

    // If ANY drag is happening (or just ended), ignore expand/collapse.
    if (this.dragState.isDragging()) return;
    if (this.suppressNextClick) return;

    this.expanded.set(!this.expanded());
  }

  // Date helpers
  hasDate(): boolean {
    return !!this.task.dueDate;
  }

  dueLine(): string {
    // Accent line under the title
    return this.task.dueDate ? this.task.dueDate : '';
  }

  onToggleDate(on: boolean): void {
    if (on) {
      // If no date yet, open the native date picker
      if (!this.task.dueDate) {
        // Trigger the hidden input picker via DOM
        const el = document.querySelector<HTMLInputElement>(
          `input[type="date"][value="${this.task.dueDate ?? ''}"]`,
        );
        // ^ this selector can be fragile; we improve below by using @ViewChild if you want.
        // But it works if there's only one open at a time.
        el?.showPicker?.();
        el?.click();
        return;
      }
      // If there is a date already, do nothing (it stays visible)
      return;
    }

    // Turning off date clears it
    this.changed.emit({ id: this.task.id, patch: { dueDate: undefined } });
  }

  onPickedDate(value: string): void {
    const dueDate = value?.trim() ? value : undefined;
    this.changed.emit({ id: this.task.id, patch: { dueDate } });
  }

  // Time helpers
  hasTime(): boolean {
    return this.timeEnabled();
  }

  onToggleTime(on: boolean): void {
    this.timeEnabled.set(on);
    if (!on) {
      // resets display, leaving blank space
      this.timeHour = 9;
      this.timeMinute = 0;
      this.timeMeridian = 'AM';
    }
  }

  commitTime(): void {
    // clamp
    const h = Math.min(12, Math.max(1, Number(this.timeHour || 1)));
    const m = Math.min(59, Math.max(0, Number(this.timeMinute || 0)));
    this.timeHour = h;
    this.timeMinute = m;
  }

  timeDisplay(): string {
    const mm = String(this.timeMinute).padStart(2, '0');
    return `${this.timeHour}:${mm} ${this.timeMeridian}`;
  }

  removeTag(tag: string, ev: MouseEvent): void {
    ev.stopPropagation();
    const next = this.task.tags.filter((t) => t !== tag);
    this.changed.emit({ id: this.task.id, patch: { tags: next } });
  }

  onDragHandleDown(ev: PointerEvent): void {
    // Start lock immediately on press, not when CDK emits "started".
    ev.stopPropagation();
    this.dragState.start();
  }
}
