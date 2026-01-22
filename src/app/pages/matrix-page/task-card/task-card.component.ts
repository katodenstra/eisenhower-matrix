import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CdkDrag, DragDropModule } from '@angular/cdk/drag-drop';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { Task } from '../../../models/task.models';
import { CalendarService } from '../../../services/calendar.service';

@Component({
  standalone: true,
  selector: 'app-task-card',
  imports: [DragDropModule, CdkDrag],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: 0, marginTop: '0px' })),
      state('expanded', style({ height: '*', opacity: 1, marginTop: '10px' })),
      transition('collapsed <=> expanded', animate('180ms ease')),
    ]),
  ],
  template: `
    <article class="card" cdkDrag [style.borderColor]="accent">
      <div class="top" (click)="toggleExpanded()">
        <div class="left">
          <div class="title-row">
            <div class="title" [class.title--done]="task.completed">{{ task.title }}</div>
            @if (task.dueDate) {
              <div class="badge">Due {{ task.dueDate }}</div>
            }
          </div>

          @if (task.tags.length) {
            <div class="tags">
              @for (tag of task.tags.slice(0, 3); track tag) {
                <span class="tag">{{ tag }}</span>
              }
              @if (task.tags.length > 3) {
                <span class="tag">+{{ task.tags.length - 3 }}</span>
              }
            </div>
          }
        </div>

        <div class="right" (click)="$event.stopPropagation()">
          <button class="mini" (click)="toggleComplete()" title="Complete">
            {{ task.completed ? '✓' : '○' }}
          </button>
          <button class="mini" (click)="deleted.emit(task.id)" title="Delete">✕</button>
        </div>
      </div>

      <div class="details" [@expandCollapse]="expanded() ? 'expanded' : 'collapsed'">
        <div class="details-inner">
          <div class="field">
            <label>Due date</label>
            <input
              type="date"
              [value]="task.dueDate ?? ''"
              (change)="setDueDate($any($event.target).value)"
            />
          </div>

          <div class="field">
            <label>Description</label>
            <div class="desc">{{ task.description || 'No description. Stunning.' }}</div>
          </div>

          <div class="field">
            <label>Tags</label>
            <div class="tags">
              @for (tag of task.tags; track tag) {
                <span class="tag">{{ tag }}</span>
              }
              @if (task.tags.length === 0) {
                <span class="tag muted">none</span>
              }
            </div>
          </div>

          <div class="detail-actions">
            <button (click)="calendar.downloadIcs(task)">Add to calendar</button>
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
        padding: 10px 10px;
        background: rgba(0, 0, 0, 0.18);
        backdrop-filter: blur(8px);
      }

      .top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        cursor: pointer;
        user-select: none;
      }

      .title-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .title {
        font-weight: 800;
      }
      .title--done {
        text-decoration: line-through;
        opacity: 0.7;
      }

      .badge {
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
      }

      .tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .tag {
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }
      .tag.muted {
        opacity: 0.7;
      }

      .right {
        display: flex;
        gap: 8px;
        align-items: start;
      }
      .mini {
        width: 36px;
        height: 36px;
        padding: 0;
        border-radius: 14px;
        display: grid;
        place-items: center;
      }

      .details {
        overflow: hidden;
      }
      .details-inner {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 10px;
      }

      .field {
        display: grid;
        gap: 6px;
        margin-bottom: 10px;
      }
      label {
        font-size: 12px;
        opacity: 0.78;
      }
      .desc {
        font-size: 14px;
        opacity: 0.92;
        white-space: pre-wrap;
      }

      .detail-actions {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input({ required: true }) accent!: string;

  @Output() changed = new EventEmitter<{ id: string; patch: Partial<Task> }>();
  @Output() deleted = new EventEmitter<string>();

  expanded = signal(false);

  constructor(public calendar: CalendarService) {}

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }

  toggleComplete(): void {
    this.changed.emit({ id: this.task.id, patch: { completed: !this.task.completed } });
  }

  setDueDate(value: string): void {
    const dueDate = value?.trim() ? value : undefined;
    this.changed.emit({ id: this.task.id, patch: { dueDate } });
  }
}
