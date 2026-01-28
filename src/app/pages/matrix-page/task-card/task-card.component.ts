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
import { A } from '@angular/cdk/keycodes';

type Meridian = 'AM' | 'PM';
type DatePickerAnchor = 'date' | 'switch';

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
          <span class="material-symbols-rounded">
            {{ expanded() ? 'expand_less' : 'expand_more' }}
          </span>
        </button>

        <!-- drag handle (far right) -->
        <button
          type="button"
          class="material-symbols-rounded"
          cdkDragHandle
          (pointerdown)="onDragHandleDown($event)"
          (click)="$event.stopPropagation()"
          aria-label="Reorder task"
          title="Drag to reorder"
        >
          drag_indicator
        </button>
      </div>

      <!-- accent date line -->
      <div class="meta">
        <div class="meta-inner">
          @if (task.dueDate) {
            <div class="due" [style.color]="accent">{{ task.dueDate }}</div>
          }

          @if (task.tags?.length) {
            <div class="tags-inline">
              @for (tag of task.tags.slice(0, 3); track tag) {
                <span class="tag-pill">{{ tag }}</span>
              }
              @if (task.tags.length > 3) {
                <span class="tag-pill tag-pill--muted">+{{ task.tags.length - 3 }}</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- DETAILS -->
      <div class="details" [class.details--expanded]="expanded()">
        <div class="details-inner">
          <!-- Date & time section -->
          <div class="section">
            <div class="section-title">Date & time</div>

            <!-- DATE ROW -->
            <div class="row row--date">
              <div class="row-left">
                <span class="material-symbols-rounded icon">calendar_month</span>
                <div class="row-text">
                  <div class="row-label">Date</div>

                  <!-- The "value" line (blank space when empty, as requested) -->
                  <button
                    type="button"
                    class="row-value row-value-btn"
                    (click)="openDatePicker('date', $event)"
                    [attr.aria-label]="task.dueDate ? 'Change due date' : 'Set due date'"
                  >
                    {{ task.dueDate ?? '' }}
                  </button>
                </div>
              </div>

              <label class="switch" (click)="$event.stopPropagation()">
                <input
                  type="checkbox"
                  [checked]="hasDate()"
                  (change)="onToggleDate($any($event.target).checked, $event)"
                />
                <span class="slider"></span>
              </label>
            </div>

            <!-- TIME ROW -->
            <div class="row">
              <div class="row-left">
                <span class="material-symbols-rounded icon">schedule</span>
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
                    <span class="material-symbols-rounded">close</span>
                  </button>
                </span>
              }

              @if (!addingTag()) {
                <button type="button" class="chip chip-add" (click)="startAddTag($event)">
                  <span class="material-symbols-rounded">add</span>
                  Add tag
                </button>
              } @else {
                <div class="tag-editor" (click)="$event.stopPropagation()">
                  <input
                    class="tag-input"
                    type="text"
                    placeholder="New tag"
                    [value]="newTag()"
                    (input)="newTag.set($any($event.target).value)"
                    (keydown.enter)="commitTag()"
                    (keydown.escape)="cancelAddTag()"
                  />
                  <button type="button" class="tag-ok" (click)="commitTag()" aria-label="Add tag">
                    <span class="material-symbols-rounded">check</span>
                  </button>
                </div>
              }

              @if (task.tags.length === 0 && !addingTag()) {
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
        overflow: visible;
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
        min-height: 18px;
      }

      .meta-inner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-left: calc(22px + 10px); /* align with title text */
      }

      .due {
        font-size: 13px;
        font-weight: 600;
        opacity: 0.95;
      }

      .tags-inline {
        display: flex;
        gap: 6px;
        opacity: 0.95;
      }

      .tag-pill {
        font-size: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        padding: 4px 8px;
        opacity: 0.95;
      }
      .tag-pill--muted {
        opacity: 0.7;
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
        overflow: visible;
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
      .row--date {
        position: relative;
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

      .row-value-btn {
        border: 0;
        background: transparent;
        color: inherit;
        padding: 0;
        cursor: pointer;
        text-align: left;
      }

      .row-value-btn:hover {
        text-decoration: underline;
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

      /* Tag editor */
      .chip-add {
        border: 0;
        cursor: pointer;
        color: inherit;
      }

      .tag-editor {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }

      .tag-input {
        width: 140px;
        background: transparent;
        border: 0;
        outline: none;
        color: inherit;
      }

      .tag-ok {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 0;
        background: rgba(255, 255, 255, 0.14);
        color: inherit;
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .tag-ok:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `,
  ],
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input({ required: true }) accent!: string;

  @Output() changed = new EventEmitter<{ id: string; patch: Partial<Task> }>();
  @Output() datePickerRequested = new EventEmitter<{
    taskId: string;
    rect: DOMRect;
    anchor: DatePickerAnchor;
  }>();

  expanded = signal(false);

  // Click suppression for drag end
  private suppressNextClick = false;

  // Local "time" UI state (stored in description for now unless you add fields)
  timeEnabled = signal(false);
  timeHour = 9;
  timeMinute = 0;
  timeMeridian: Meridian = 'AM';

  addingTag = signal(false);
  newTag = signal('');

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

  openDatePicker(anchor: DatePickerAnchor, ev?: Event): void {
    ev?.stopPropagation();

    const rect = this.getAnchorRect(ev);
    if (!rect) return;
    this.datePickerRequested.emit({ taskId: this.task.id, rect, anchor });
  }

  onToggleDate(on: boolean, ev?: Event): void {
    if (on) {
      this.openDatePicker('switch', ev);
      return;
    }

    //Turning off date swithch clears the date
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

  private getAnchorRect(ev?: Event): DOMRect | null {
    if (!ev) return null;
    const target = ev.target as HTMLElement | null;
    if (!target) return null;
    const switchEl = target.closest('.switch') as HTMLElement | null;
    const el = switchEl ?? target;
    return el.getBoundingClientRect();
  }

  //Adding tags when task is expanded
  startAddTag(ev?: Event): void {
    ev?.stopPropagation();
    this.addingTag.set(true);
    this.newTag.set('');
  }

  cancelAddTag(): void {
    this.addingTag.set(false);
    this.newTag.set('');
  }

  commitTag(): void {
    const raw = this.newTag().trim();
    if (!raw) return;

    const next = Array.from(new Set([...(this.task.tags ?? []), raw]));
    this.changed.emit({ id: this.task.id, patch: { tags: next } });
    this.cancelAddTag();
  }
}
