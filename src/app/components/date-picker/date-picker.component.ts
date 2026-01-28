import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

type DayCell =
  | { kind: 'empty' }
  | { kind: 'day'; date: Date; iso: string; isToday: boolean; isSelected: boolean };

@Component({
  standalone: true,
  selector: 'app-date-picker',
  host: {
    '[class.popover]': "mode === 'popover'",
  },
  template: `
    @if (mode === 'modal') {
      <div class="backdrop" (pointerdown)="close.emit()">
        <section
          class="panel"
          (pointerdown)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
        >
          <header class="header">
            <button class="nav" type="button" (click)="prevMonth()" aria-label="Previous month">
              ‹
            </button>
            <div class="title">{{ monthLabel() }}</div>
            <button class="nav" type="button" (click)="nextMonth()" aria-label="Next month">
              ›
            </button>
          </header>

          <div class="dow">
            @for (d of daysOfWeek; track d) {
              <div class="dow-cell">{{ d }}</div>
            }
          </div>

          <div class="grid">
            @for (cell of cells(); track $index) {
              @if (cell.kind === 'empty') {
                <div class="cell empty"></div>
              } @else {
                <button
                  type="button"
                  class="cell day"
                  [class.today]="cell.isToday"
                  [class.selected]="cell.isSelected"
                  (click)="select(cell.iso)"
                >
                  {{ cell.date.getDate() }}
                </button>
              }
            }
          </div>
        </section>
      </div>
    } @else {
      <section class="panel panel--popover" (click)="$event.stopPropagation()" role="dialog">
        <header class="header">
          <button class="nav" type="button" (click)="prevMonth()" aria-label="Previous month">
            ‹
          </button>
          <div class="title">{{ monthLabel() }}</div>
          <button class="nav" type="button" (click)="nextMonth()" aria-label="Next month">›</button>
        </header>

        <div class="dow">
          @for (d of daysOfWeek; track d) {
            <div class="dow-cell">{{ d }}</div>
          }
        </div>

        <div class="grid">
          @for (cell of cells(); track $index) {
            @if (cell.kind === 'empty') {
              <div class="cell empty"></div>
            } @else {
              <button
                type="button"
                class="cell day"
                [class.today]="cell.isToday"
                [class.selected]="cell.isSelected"
                (click)="select(cell.iso)"
              >
                {{ cell.date.getDate() }}
              </button>
            }
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      :host.popover {
        display: block;
      }

      .backdrop {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(10px);
        z-index: 9999;
      }

      .panel {
        --cell: 44px;
        --gap: 10px;
        --pad: 14px;

        padding: var(--pad);
        border-radius: 18px;

        min-width: calc(var(--pad) * 2 + (var(--cell) * 7) + (var(--gap) * 6));
        width: min(520px, 96vw);

        background: rgba(35, 35, 35, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        color: rgba(255, 255, 255, 0.92);
        box-sizing: border-box;
      }
      .panel--popover {
        width: 320px;
        border-radius: 16px;
      }

      .header {
        display: grid;
        grid-template-columns: 44px 1fr 44px;
        align-items: center;
        margin-bottom: 10px;
      }

      .title {
        text-align: center;
        font-weight: 700;
        letter-spacing: 0.02em;
        font-size: 18px;
      }

      .nav {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 0;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        cursor: pointer;
        display: grid;
        place-items: center;
        font-size: 20px;
      }
      .nav:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .dow {
        display: grid;
        grid-template-columns: repeat(7, var(--cell));
        gap: var(--gap);
        width: fit-content;
        margin: 8px auto 10px;
        padding: 0 2px;
      }

      .dow-cell {
        width: var(--cell);
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.18em;
        opacity: 0.65;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(7, var(--cell));
        gap: var(--gap);
        width: fit-content;
        margin: 0 auto;
        padding: 0 2px 2px;
        box-sizing: border-box;
      }

      .cell {
        width: var(--cell);
        height: var(--cell);
        border-radius: 14px;
        display: grid;
        place-items: center;
        box-sizing: border-box;
      }

      .empty {
        background: transparent;
      }

      .day {
        /* Fill the square cell, never define its own height */
        width: 100%;
        height: 100%;
        border-radius: 14px;
        border: 0;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.92);
        cursor: pointer;

        /* Typography smaller + thinner */
        font-weight: 600;
        font-size: 15px;
      }
      .day:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .day.today {
        outline: 2px solid rgba(255, 255, 255, 0.18);
      }
      .day.selected {
        background: #ff4d1f;
        color: #fff;
      }
    `,
  ],
})
export class DatePickerComponent {
  @Input() mode: 'modal' | 'popover' = 'modal';
  @Input() value?: string; // yyyy-mm-dd
  @Output() selected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  readonly daysOfWeek = ['SAN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  private view = signal(this.startingMonth());

  monthLabel = computed(() => {
    const d = this.view();
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  });

  cells = computed<DayCell[]>(() => {
    const view = this.view();
    const year = view.getFullYear();
    const month = view.getMonth();

    const first = new Date(year, month, 1);
    const firstDow = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const selectedIso = this.value ?? '';
    const todayIso = this.toIso(new Date());

    const cells: DayCell[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ kind: 'empty' });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const iso = this.toIso(date);
      cells.push({
        kind: 'day',
        date,
        iso,
        isToday: iso === todayIso,
        isSelected: iso === selectedIso,
      });
    }

    return cells;
  });

  prevMonth(): void {
    const d = this.view();
    this.view.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.view();
    this.view.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  select(iso: string): void {
    this.selected.emit(iso);
  }

  private startingMonth(): Date {
    if (this.value) {
      const [y, m] = this.value.split('-').map(Number);
      if (!Number.isNaN(y) && !Number.isNaN(m)) return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
