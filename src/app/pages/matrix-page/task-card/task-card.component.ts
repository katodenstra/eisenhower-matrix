import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  CdkDrag,
  DragDropModule,
  CdkDragStart,
  CdkDragEnd,
  CdkDragHandle,
} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { QUADRANTS, Task } from '../../../models/task.models';
import { DragStateService } from '../../../services/drag-state.service';
import { ANIMATION_TIMINGS, SIZES, formatDateDDMMYYYY } from '../../../constants/constants';

type Meridian = 'AM' | 'PM';
type DatePickerAnchor = 'date' | 'switch';

/**
 * Task Card Component
 *
 * Displays a single task with interactive controls.
 * Supports:
 * - Completion toggle with visual feedback
 * - Drag-and-drop reordering/moving to other quadrants
 * - Task expansion for detailed view
 * - Due date picking
 * - Accessibility features (ARIA, keyboard support)
 *
 * Uses OnPush change detection for optimal performance
 *
 * @example
 * ```html
 * <app-task-card
 *   [task]="task"
 *   [accent]="borderColor"
 *   (changed)="onTaskChanged($event)"
 * />
 * ```
 */
@Component({
  standalone: true,
  selector: 'app-task-card',
  imports: [DragDropModule, CdkDrag, CdkDragHandle, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
          <input
            #titleField
            class="title-input"
            [class.title--done]="task.completed && !isCompletedQuadrant()"
            [class.title--completed]="isCompletedQuadrant()"
            [class.title-input--editable]="expanded()"
            [readOnly]="!expanded()"
            [attr.tabindex]="expanded() ? 0 : -1"
            [(ngModel)]="titleDraft"
            (focus)="onTitleFocus()"
            (blur)="onTitleBlur()"
            aria-label="Task title"
          />
        </div>

        <button
          type="button"
          class="delete-action"
          (click)="requestDelete($event)"
          aria-label="Delete task"
          title="Delete task"
        >
          <span class="material-symbols-rounded">delete</span>
        </button>

        <!-- expand button - changes to color dot when task is in COMPLETED -->
        @if (isCompletedQuadrant()) {
          <span
            class="origin-dot"
            [style.backgroundColor]="originDotColor()"
            aria-label="Original quadrant"
            title="Original quadrant"
          ></span>
        } @else {
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
        }

        <!-- drag handle (far right) -->
        <button
          type="button"
          class="material-symbols-rounded drag-handle"
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
            <div class="due" [style.color]="accent">{{ formatDateDDMMYYYY(task.dueDate) }}</div>
          }

          @if (task.tags.length) {
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

      <!-- DETAILS (disabled in COMPLETED by simply never showing expand button; still safe to keep collapsed) -->
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

                  <button
                    type="button"
                    class="row-value row-value-btn"
                    (click)="openDatePicker('date', $event)"
                    [attr.aria-label]="task.dueDate ? 'Change due date' : 'Set due date'"
                  >
                    {{ formatDateDDMMYYYY(task.dueDate) }}
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
            <div class="time-field" #timeField>
              <div class="row row--time" (click)="openTimePicker($event)">
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

              @if (timePickerOpen()) {
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
          </div>

          <!-- Description section -->
          <div class="section">
            <div class="section-title">Description</div>
            <div class="desc-field">
              <textarea
                class="desc-input"
                rows="4"
                [(ngModel)]="descriptionDraft"
                (focus)="onDescriptionFocus()"
                (blur)="onDescriptionBlur()"
                placeholder="Add context..."
              ></textarea>
            </div>
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
                <div #tagEditor class="tag-editor" (click)="$event.stopPropagation()">
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

      .header {
        display: grid;
        grid-template-columns: auto 1fr auto auto auto;
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

      /* Completed quadrant style: dimmed but NOT crossed out */
      .title--completed {
        opacity: 0.55;
        text-decoration: none;
        font-weight: 700;
      }

      .title-input {
        width: 90%;
        min-width: 0;
        height: 40px;
        font: inherit;
        font-weight: 800;
        font-size: 18px;
        color: inherit;
        background: transparent;
        border: 1px solid transparent;
        padding: 0 12px;
        margin: 0;
        outline: none;
        border-radius: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .title-input--editable:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .origin-dot {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        display: inline-block;
        margin-right: 6px;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
      }

      .expand,
      .drag-handle,
      .delete-action {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        border: 1px solid transparent;
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
      .drag-handle:active,
      .delete-action:active {
        transform: translateY(1px);
      }

      .drag-handle {
        cursor: grab;
        opacity: 0.9;
      }
      .drag-handle:active {
        cursor: grabbing;
      }

      .delete-action:hover {
        border-color: rgba(255, 92, 92, 0.6);
        background: rgba(255, 92, 92, 0.15);
      }

      .meta {
        margin-top: 8px;
        min-height: 18px;
      }

      .meta-inner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-left: calc(22px + 10px);
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

      .details {
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        margin-top: 0;
        transition:
          max-height 180ms ease,
          opacity 180ms ease,
          margin-top 180ms ease;
      }

      .details--expanded {
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
        min-height: 16px;
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

      .time-field {
        position: relative;
      }

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

      .desc-input {
        width: 100%;
        min-height: 120px;
        resize: vertical;
        box-sizing: border-box;
        border: 0;
        background: transparent;
        padding: 0;
      }

      .desc-field {
        padding: 10px 10px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .time-input {
        width: 64px;
        text-align: center;
        height: 40px;
        padding: 6px 8px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #e9eef7;
        font-size: 14px;
        line-height: 1;
        box-sizing: border-box;
      }

      .time-input::-webkit-inner-spin-button,
      .time-input::-webkit-outer-spin-button {
        filter: invert(1);
      }
      .time-sep {
        opacity: 0.7;
        font-weight: 800;
      }
      .time-meridian {
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #e9eef7;
        height: 40px;
        padding: 6px 12px;
        box-sizing: border-box;
        font-size: 14px;
        line-height: 1;
        appearance: none;
        -webkit-appearance: none;
      }

      .chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-size: 12px;
      }
      .chip--muted {
        opacity: 0.7;
      }
      .chip-x {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        border: 0;
        background: rgba(255, 255, 255, 0.14);
        color: inherit;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
        font-size: 0.45em;
      }

      .chip-x .material-symbols-rounded {
        font-size: 12px;
        line-height: 1;
      }
      .chip-x:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .chip-add {
        border: 0;
        cursor: pointer;
        color: inherit;
      }

      .chip-add .material-symbols-rounded {
        font-size: 16px;
        line-height: 1;
      }

      .tag-editor {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-size: 12px;
      }

      .tag-input {
        width: 120px;
        background: transparent;
        border: 0;
        outline: none;
        color: inherit;
        font-size: 12px;
        line-height: 1;
      }

      .tag-ok {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        border: 0;
        background: rgba(255, 255, 255, 0.14);
        color: inherit;
        display: grid;
        padding: 0;
        place-items: center;
        cursor: pointer;
      }
      .tag-ok:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .tag-ok .material-symbols-rounded {
        font-size: 12px;
        line-height: 1;
      }
    `,
  ],
})
export class TaskCardComponent implements OnChanges {
  @Input({ required: true }) task!: Task;
  @Input({ required: true }) accent!: string;
  @ViewChild('titleField') titleField?: ElementRef<HTMLInputElement>;
  @ViewChild('tagEditor') tagEditor?: ElementRef<HTMLElement>;
  @ViewChild('timeField') timeField?: ElementRef<HTMLElement>;

  @Output() changed = new EventEmitter<{ id: string; patch: Partial<Task> }>();
  @Output() deleteRequested = new EventEmitter<{ id: string; title: string }>();
  @Output() datePickerRequested = new EventEmitter<{
    taskId: string;
    rect: DOMRect;
    anchor: DatePickerAnchor;
  }>();

  expanded = signal(false);

  private suppressNextClick = false;

  timeEnabled = signal(false);
  timePickerOpen = signal(false);
  timeHour = 9;
  timeMinute = 0;
  timeMeridian: Meridian = 'AM';

  descriptionDraft = '';
  private descriptionFocused = false;

  titleDraft = '';
  private titleFocused = false;

  addingTag = signal(false);
  newTag = signal('');

  // Expose date formatter for template
  formatDateDDMMYYYY = formatDateDDMMYYYY;

  constructor(private dragState: DragStateService) {}

  isCompletedQuadrant(): boolean {
    return this.task.quadrant === 'COMPLETED';
  }

  onDragStarted(_ev: CdkDragStart): void {
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
    if (this.dragState.isDragging()) return;
    if (this.suppressNextClick) return;
    this.expanded.set(!this.expanded());
  }

  requestDelete(ev: MouseEvent): void {
    ev.stopPropagation();
    this.deleteRequested.emit({ id: this.task.id, title: this.task.title });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('task' in changes && !this.descriptionFocused) {
      this.descriptionDraft = this.task.description ?? '';
    }
    if ('task' in changes && !this.titleFocused) {
      this.titleDraft = this.task.title ?? '';
    }
  }

  hasDate(): boolean {
    return !!this.task.dueDate;
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
    this.changed.emit({ id: this.task.id, patch: { dueDate: undefined } });
  }

  hasTime(): boolean {
    return this.timeEnabled();
  }

  onToggleTime(on: boolean): void {
    this.timeEnabled.set(on);
    if (!on) {
      this.timePickerOpen.set(false);
      this.timeHour = 9;
      this.timeMinute = 0;
      this.timeMeridian = 'AM';
      return;
    }
    this.timePickerOpen.set(true);
  }

  openTimePicker(ev?: Event): void {
    ev?.stopPropagation();
    if (!this.timeEnabled()) {
      this.timeEnabled.set(true);
    }
    this.timePickerOpen.set(true);
  }

  commitTime(): void {
    const h = Math.min(12, Math.max(1, Number(this.timeHour || 1)));
    const m = Math.min(59, Math.max(0, Number(this.timeMinute || 0)));
    this.timeHour = h;
    this.timeMinute = m;
  }

  timeDisplay(): string {
    const mm = String(this.timeMinute).padStart(2, '0');
    return `${this.timeHour}:${mm} ${this.timeMeridian}`;
  }

  onDescriptionFocus(): void {
    this.descriptionFocused = true;
  }

  onDescriptionBlur(): void {
    this.descriptionFocused = false;
    const trimmed = this.descriptionDraft.trim();
    const next = trimmed ? trimmed : undefined;
    if ((this.task.description ?? undefined) === next) return;
    this.changed.emit({ id: this.task.id, patch: { description: next } });
  }

  removeTag(tag: string, ev: MouseEvent): void {
    ev.stopPropagation();
    const next = this.task.tags.filter((t) => t !== tag);
    this.changed.emit({ id: this.task.id, patch: { tags: next } });
  }

  onDragHandleDown(ev: PointerEvent): void {
    ev.stopPropagation();
    this.dragState.start();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (this.timePickerOpen()) {
      const field = this.timeField?.nativeElement;
      if (!(field && target && field.contains(target))) {
        this.timePickerOpen.set(false);
      }
    }

    this.commitTitleOnOutsideClick(target);
    this.closeTagEditorOnOutsideClick(target);
  }

  onTitleFocus(): void {
    this.titleFocused = true;
  }

  onTitleBlur(): void {
    this.titleFocused = false;
  }

  private commitTitleOnOutsideClick(target: Node | null): void {
    if (!this.expanded()) return;
    if (!target) return;

    const titleEl = this.titleField?.nativeElement;
    if (titleEl && titleEl.contains(target)) return;

    const targetEl = target as HTMLElement;
    if (targetEl?.closest?.('button')) return;

    this.commitTitleIfChanged();
  }

  private commitTitleIfChanged(): void {
    const next = this.titleDraft.trim();
    if (!next) {
      this.titleDraft = this.task.title;
      return;
    }
    if (next === this.task.title) return;
    this.changed.emit({ id: this.task.id, patch: { title: next } });
  }

  private closeTagEditorOnOutsideClick(target: Node | null): void {
    if (!this.addingTag()) return;
    if (!target) {
      this.cancelAddTag();
      return;
    }

    const editorEl = this.tagEditor?.nativeElement;
    if (editorEl && editorEl.contains(target)) return;

    const targetEl = target as HTMLElement;
    if (targetEl?.closest?.('.chip-add')) return;

    this.cancelAddTag();
  }

  private getAnchorRect(ev?: Event): DOMRect | null {
    if (!ev) return null;
    const target = ev.target as HTMLElement | null;
    if (!target) return null;
    const switchEl = target.closest('.switch') as HTMLElement | null;
    const el = switchEl ?? target;
    return el.getBoundingClientRect();
  }

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

  originDotColor(): string {
    const q = this.task.previousQuadrantId;
    if (!q) return 'rgba(255,255,255,0.35)';

    const found = QUADRANTS.find((x) => x.id === q);
    return found?.border ?? 'rgba(255,255,255,0.35)';
  }
}
