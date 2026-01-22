import { Injectable, signal } from '@angular/core';

/**
 * Shared drag state to prevent “mouseup click” side effects after dragging.
 * This is global because the click can land on a DIFFERENT card than the dragged one.
 */
@Injectable({ providedIn: 'root' })
export class DragStateService {
  readonly isDragging = signal(false);

  start(): void {
    this.isDragging.set(true);
  }

  end(): void {
    // Keep it true for the click that happens right after drop (mouseup -> click).
    requestAnimationFrame(() => {
      setTimeout(() => this.isDragging.set(false), 120);
    });
  }
}
