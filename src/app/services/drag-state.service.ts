import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DragStateService {
  readonly isDragging = signal(false);

  private endTimer: number | null = null;

  start(): void {
    if (this.endTimer !== null) {
      window.clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    if (!this.isDragging()) {
      this.isDragging.set(true);
      document.body.classList.add('drag-lock');
    }
  }

  end(): void {
    if (this.endTimer !== null) window.clearTimeout(this.endTimer);

    // Keep lock long enough to swallow mouseup->click (and any delayed handlers).
    this.endTimer = window.setTimeout(() => {
      this.isDragging.set(false);
      document.body.classList.remove('drag-lock');
      this.endTimer = null;
    }, 350);
  }
}
