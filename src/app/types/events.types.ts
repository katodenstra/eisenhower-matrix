/**
 * Type-safe Event Interfaces
 * Centralized event types for better type safety and documentation
 */

import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Task, QuadrantId } from '../models/task.models';

// ===== QUADRANT COMPONENT EVENTS =====

/** Emitted when user requests to create a new task in a quadrant */
export interface QuadrantNewTaskEvent {
  quadrantId: QuadrantId;
}

/** Emitted when user toggles quadrant expansion */
export interface QuadrantToggleExpandEvent {
  quadrantId: Exclude<QuadrantId, 'UNCATEGORIZED' | 'COMPLETED'>;
}

/** Emitted when a task is modified within a quadrant */
export interface QuadrantTaskChangedEvent {
  id: string;
  patch: Partial<Task>;
}

/** Emitted when a task is deleted from a quadrant */
export interface QuadrantTaskDeletedEvent {
  taskId: string;
  quadrantId: QuadrantId;
}

/** Emitted when a task is dropped (drag-drop) */
export interface QuadrantTaskDropEvent {
  dropEvent: CdkDragDrop<Task[]>;
  toQuadrantId: QuadrantId;
}

/** Emitted when user opens the date picker */
export interface QuadrantDatePickerRequestEvent {
  taskId: string;
  rect: DOMRect;
  anchor: 'date' | 'switch';
}

// ===== TASK CARD COMPONENT EVENTS =====

/** Emitted when task completion status is toggled */
export interface TaskCompletionToggleEvent {
  taskId: string;
  completed: boolean;
}

/** Emitted when task is expanded/collapsed in detail view */
export interface TaskExpandToggleEvent {
  taskId: string;
  expanded: boolean;
}

/** Emitted when task is about to be dragged */
export interface TaskDragStartEvent {
  taskId: string;
  fromQuadrantId: QuadrantId;
}

/** Emitted when task drag ends */
export interface TaskDragEndEvent {
  taskId: string;
  succeeded: boolean;
}

// ===== MATRIX PAGE COMPONENT EVENTS =====

/** Emitted when the expanded quadrant changes */
export interface MatrixExpandedQuadrantChangedEvent {
  quadrantId: Exclude<QuadrantId, 'UNCATEGORIZED' | 'COMPLETED'> | null;
}

/** Emitted when task editor is opened */
export interface TaskEditorOpenedEvent {
  quadrantId: QuadrantId;
  taskId?: string; // undefined for new task, defined for editing
}

/** Emitted when task editor is closed */
export interface TaskEditorClosedEvent {
  saved: boolean;
  taskId?: string;
}

// ===== ERROR EVENTS =====

/** Emitted when an error occurs */
export interface ErrorOccurredEvent {
  code: string;
  message: string;
  context?: Record<string, any>;
  recoverable: boolean;
}

// ===== STATE CHANGE EVENTS =====

/** Emitted when UI state changes (for accessibility announcements) */
export interface UIStateChangeEvent {
  type: 'task_added' | 'task_deleted' | 'task_moved' | 'quadrant_expanded' | 'quadrant_collapsed';
  description: string;
  priority: 'polite' | 'assertive';
}
