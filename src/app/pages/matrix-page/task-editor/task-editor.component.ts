import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuadrantId } from '../../../models/task.models';
import { DatePickerComponent } from '../../../components/date-picker/date-picker.component';

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
            <button class="mini" (click)="close.emit()">✕</button>
          </header>

          <div class="body">
            <div class="field">
              <label>Task name</label>
              <input [(ngModel)]="title" placeholder="e.g., conquer the day" />
            </div>

            <button class="collapser" (click)="showOptions.set(!showOptions())">
              {{ showOptions() ? 'Hide options' : 'More options' }}
            </button>

            @if (showOptions()) {
              <div class="options">
                <div class="field">
                  <label>Due date (optional)</label>
                  <div class="date-field" #dateField>
                    <div class="date-row">
                      <button type="button" class="date-btn" (click)="openDatePicker()">
                        {{ dueDate || 'Select date' }}
                      </button>
                      @if (dueDate) {
                        <button type="button" class="date-clear" (click)="clearDate()">Clear</button>
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
                  ></textarea>
                </div>

                <div class="field">
                  <label>Tags (comma separated)</label>
                  <input [(ngModel)]="tagsRaw" placeholder="work, personal, admin" />
                </div>
              </div>
            }

            <div class="footer">
              <button (click)="close.emit()">Cancel</button>
              <button (click)="submit()" [disabled]="!title.trim()">Create</button>
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
    description?: string;
    tags: string[];
  }>();

  // Local form state
  title = '';
  dueDate = '';
  description = '';
  tagsRaw = '';

  showOptions = signal(false);
  datePickerOpen = signal(false);

  openDatePicker(): void {
    this.datePickerOpen.set(true);
  }

  onDatePicked(iso: string): void {
    this.dueDate = iso;
    this.datePickerOpen.set(false);
  }

  clearDate(): void {
    this.dueDate = '';
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
      description: this.description?.trim() ? this.description.trim() : undefined,
      tags,
    });

    // Reset for next time
    this.title = '';
    this.dueDate = '';
    this.description = '';
    this.tagsRaw = '';
    this.showOptions.set(false);
    this.datePickerOpen.set(false);
  }
}
