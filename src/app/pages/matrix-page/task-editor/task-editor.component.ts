import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuadrantId } from '../../../models/task.models';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';
import { formatDateDDMMYYYY } from '../../../constants/constants';

@Component({
  standalone: true,
  selector: 'app-task-editor',
  template: `
    @if (open) {
      <div class="overlay" (click)="close.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <header class="head">
            <div>
              <div class="title">New task</div>
              <div class="sub">
                Quadrant: <b>{{ quadrant }}</b>
              </div>
            </div>
            <button class="mini" (click)="closeDialog()">✕</button>
          </header>

          <div class="body">
            <div class="field">
              <label>Task name</label>
              <input
                [(ngModel)]="title"
                placeholder="e.g., conquer the day"
                autofocus
                tabindex="1"
              />
            </div>

            <button
              type="button"
              class="collapser"
              (click)="showOptions.set(!showOptions())"
              tabindex="2"
            >
              {{ showOptions() ? 'Hide options' : 'More options' }}
            </button>

            @if (showOptions()) {
              <div class="options">
                <div class="field">
                  <label>Due date & time (optional)</label>
                  <div class="date-field" #dateField>
                    <div class="date-row">
                      <button
                        type="button"
                        class="date-btn"
                        (click)="openDatePicker()"
                        tabindex="3"
                      >
                        {{ formatDateDDMMYYYY(dueDate) || 'Select date' }}
                      </button>
                      @if (dueDate) {
                        <button type="button" class="date-clear" (click)="clearDate()">
                          Clear
                        </button>
                      }
                      @if (dueDate) {
                        <div class="time-picker-inline">
                          <input
                            class="time-input-field"
                            type="text"
                            maxlength="2"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            [(ngModel)]="timeHourStr"
                            (ngModelChange)="validateHour()"
                            aria-label="Hour"
                          />
                          <span class="time-sep">:</span>
                          <input
                            class="time-input-field"
                            type="text"
                            maxlength="2"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            [(ngModel)]="timeMinuteStr"
                            (ngModelChange)="validateMinute()"
                            aria-label="Minutes"
                          />
                          <select
                            class="time-meridian"
                            [(ngModel)]="timeMeridian"
                            aria-label="AM/PM"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      }
                    </div>

                    @if (datePickerOpen()) {
                      <div class="date-popover" (click)="$event.stopPropagation()">
                        <app-date-picker
                          [mode]="'popover'"
                          [value]="dueDate"
                          (selected)="onDatePicked($event)"
                        />
                      </div>
                    }
                  </div>
                </div>

                <div class="field">
                  <label>Description (optional)</label>
                  <textarea
                    rows="6"
                    [(ngModel)]="description"
                    placeholder="Add context..."
                    tabindex="4"
                  ></textarea>
                </div>

                <div class="field">
                  <label>Tags (comma separated)</label>
                  <input [(ngModel)]="tagsRaw" placeholder="work, personal, admin" tabindex="5" />
                </div>
              </div>
            }

            <div class="footer">
              <button (click)="closeDialog()" tabindex="6">Cancel</button>
              <button (click)="submit()" [disabled]="!title.trim()" tabindex="7">Create</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: grid;
        place-items: center;
        z-index: 30;
        padding: 18px;
      }
      .modal {
        width: min(560px, 100%);
        min-height: 520px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(20, 22, 30, 0.92);
        backdrop-filter: blur(16px);
        overflow: hidden;
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .title {
        font-weight: 800;
      }
      .sub {
        font-size: 12px;
        opacity: 0.78;
        margin-top: 3px;
      }
      .mini {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 14px;
      }

      .body {
        padding: 14px;
        display: grid;
        gap: 12px;
      }
      .field {
        display: grid;
        gap: 6px;
      }
      label {
        font-size: 12px;
        opacity: 0.78;
      }

      .collapser {
        justify-self: start;
      }

      .options {
        padding: 12px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: grid;
        gap: 12px;
      }

      .options textarea {
        min-height: 140px;
        resize: vertical;
      }

      .date-field {
        position: relative;
      }

      .date-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .date-btn {
        flex: 1 1 auto;
        height: 40px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: inherit;
        text-align: left;
        padding: 0 12px;
        cursor: pointer;
      }

      .date-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .time-input {
        height: 40px;
        width: 120px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: inherit;
        padding: 0 12px;
        font-size: 14px;
        cursor: pointer;
      }

      .time-input:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .time-input:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
      }

      .time-picker-inline {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 40px;
        padding: 0 8px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
      }

      .time-input-field {
        width: 40px;
        height: 32px;
        border: none;
        background: transparent;
        color: inherit;
        text-align: center;
        font-size: 16px;
        font-weight: 600;
        padding: 0;
        cursor: pointer;
      }

      .time-input-field:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
      }

      .time-input-field::-webkit-outer-spin-button,
      .time-input-field::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .time-input-field[type='number'] {
        -moz-appearance: textfield;
      }

      .time-sep {
        font-weight: 600;
        opacity: 0.6;
      }

      .time-meridian {
        width: 65px;
        height: 32px;
        border: none;
        background: transparent;
        color: inherit;
        font-size: 14px;
        font-weight: 600;
        padding: 0 6px;
        cursor: pointer;
      }

      .time-meridian:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
      }

      .date-clear {
        height: 40px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: transparent;
        color: inherit;
        padding: 0 12px;
        cursor: pointer;
      }

      .date-popover {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        z-index: 10;
      }

      .footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 6px;
      }
    `,
  ],
  imports: [FormsModule, DatePickerComponent],
})
export class TaskEditorComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) quadrant: QuadrantId = 'UNCATEGORIZED';
  @ViewChild('dateField') dateField?: ElementRef<HTMLElement>;

  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{
    title: string;
    quadrant: QuadrantId;
    dueDate?: string;
    dueTime?: string;
    description?: string;
    tags: string[];
  }>();

  // Local form state
  title = '';
  dueDate = '';
  description = '';
  tagsRaw = '';

  timeHourStr = '12';
  timeMinuteStr = '00';

  // Expose date formatter for template
  formatDateDDMMYYYY = formatDateDDMMYYYY;
  timeMeridian: 'AM' | 'PM' = 'AM';

  showOptions = signal(false);
  datePickerOpen = signal(false);

  openDatePicker(): void {
    this.datePickerOpen.set(true);
  }

  closeDialog(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.title = '';
    this.dueDate = '';
    this.description = '';
    this.tagsRaw = '';
    this.resetTime();
    this.showOptions.set(false);
    this.datePickerOpen.set(false);
  }

  onDatePicked(iso: string): void {
    this.dueDate = iso;
    this.datePickerOpen.set(false);
  }

  clearDate(): void {
    this.dueDate = '';
    this.resetTime();
  }

  private resetTime(): void {
    this.timeHourStr = '12';
    this.timeMinuteStr = '00';
    this.timeMeridian = 'AM';
  }

  validateHour(): void {
    let num = parseInt(this.timeHourStr, 10);
    if (isNaN(num) || this.timeHourStr === '') {
      this.timeHourStr = '12';
      return;
    }
    if (num < 1) num = 1;
    if (num > 12) num = 12;
    this.timeHourStr = String(num).padStart(2, '0');
  }

  validateMinute(): void {
    let num = parseInt(this.timeMinuteStr, 10);
    if (isNaN(num) || this.timeMinuteStr === '') {
      this.timeMinuteStr = '00';
      return;
    }
    if (num < 0) num = 0;
    if (num > 59) num = 59;
    this.timeMinuteStr = String(num).padStart(2, '0');
  }

  private buildDueTime(): string | undefined {
    const hour12 = parseInt(this.timeHourStr, 10);
    const minute = parseInt(this.timeMinuteStr, 10);

    if (isNaN(hour12) || isNaN(minute)) return undefined;

    // Convert 12-hour to 24-hour format
    let hour24 = hour12;
    if (this.timeMeridian === 'PM' && hour12 !== 12) {
      hour24 += 12;
    } else if (this.timeMeridian === 'AM' && hour12 === 12) {
      hour24 = 0;
    }

    const h = String(hour24).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.datePickerOpen()) return;
    const target = event.target as Node | null;
    const field = this.dateField?.nativeElement;
    if (field && target && field.contains(target)) return;
    this.datePickerOpen.set(false);
  }

  submit(): void {
    const tags = this.tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    this.create.emit({
      title: this.title.trim(),
      quadrant: this.quadrant,
      dueDate: this.dueDate?.trim() ? this.dueDate : undefined,
      dueTime: this.buildDueTime(),
      description: this.description?.trim() ? this.description.trim() : undefined,
      tags,
    });

    // Reset for next time
    this.title = '';
    this.dueDate = '';
    this.description = '';
    this.tagsRaw = '';
    this.resetTime();
    this.showOptions.set(false);
    this.datePickerOpen.set(false);
  }
}
