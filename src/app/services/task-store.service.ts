import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task, QuadrantId } from '../models/task.models';
import { IdService } from './id.service';
import { STORAGE_KEYS } from '../constants/constants';

/**
 * Task Store Service
 *
 * Centralized state management for all tasks in the application.
 * Handles:
 * - Task CRUD operations
 * - Task state transitions (completion, quadrant movement)
 * - LocalStorage persistence
 * - Observable stream for reactive updates
 *
 * Important: Always maintains referential integrity for tasks within each quadrant
 * to ensure CDK drag-drop functionality works correctly.
 */
@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  /** Observable stream of task list changes */
  private readonly _tasks$ = new BehaviorSubject<Task[]>(this.load());
  readonly tasks$ = this._tasks$.asObservable();

  constructor(private ids: IdService) {}

  /**
   * Get the current snapshot of all tasks
   * Use for synchronous access to task state
   */
  get snapshot(): Task[] {
    return this._tasks$.value;
  }

  /**
   * Create a new task
   * Automatically handles:
   * - ID generation
   * - Timestamp initialization
   * - Default values
   * - Storage persistence
   *
   * @param partial - Task data with at least title and quadrant
   * @returns The created task with generated ID and timestamps
   * @example
   * ```typescript
   * const task = this.store.createTask({
   *   title: 'Write report',
   *   quadrant: 'DO_NOW'
   * });
   * ```
   */
  createTask(partial: Pick<Task, 'title' | 'quadrant'> & Partial<Task>): Task {
    const now = Date.now();
    const task: Task = {
      id: this.ids.makeId('task'),
      title: partial.title.trim(),
      description: partial.description?.trim() ?? '',
      tags: partial.tags ?? [],
      dueDate: partial.dueDate,
      dueTime: partial.dueTime,
      completed: false,
      quadrant: partial.quadrant,
      createdAt: now,
      updatedAt: now,
    };

    this.set([...this.snapshot, task]);
    return task;
  }

  /**
   * Update an existing task
   *
   * Handles special state transitions:
   * - Completing a task moves it to COMPLETED quadrant
   * - Uncompleting restores it to the previous quadrant
   * - Dragging to COMPLETED marks as complete
   * - Dragging out of COMPLETED marks as incomplete
   *
   * @param id - The task ID to update
   * @param patch - Partial task updates
   * @example
   * ```typescript
   * this.store.updateTask('task-123', {
   *   completed: true,
   *   title: 'Updated title'
   * });
   * ```
   */
  updateTask(id: string, patch: Partial<Task>): void {
    const list = this.snapshot;
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const current = list[idx];
    const next: Task = { ...current, ...patch };

    const completedWasToggledOn = patch.completed === true && current.completed !== true;
    const completedWasToggledOff = patch.completed === false && current.completed === true;

    const quadrantWasChanged =
      typeof patch.quadrant === 'string' && patch.quadrant !== current.quadrant;
    const movedIntoCompleted = quadrantWasChanged && patch.quadrant === 'COMPLETED';
    const movedOutOfCompleted =
      quadrantWasChanged && current.quadrant === 'COMPLETED' && patch.quadrant !== 'COMPLETED';

    // 1) Completing via checkbox from ANY quadrant:
    if (completedWasToggledOn) {
      if (current.quadrant !== 'COMPLETED') {
        next.previousQuadrantId = current.quadrant;
      }
      next.quadrant = 'COMPLETED';
      next.completed = true;
    }

    // 2) Un-completing via checkbox while inside COMPLETED:
    if (completedWasToggledOff && current.quadrant === 'COMPLETED') {
      next.quadrant = current.previousQuadrantId ?? 'UNCATEGORIZED';
      next.previousQuadrantId = undefined;
      next.completed = false;
    }

    // 3) Completing via DRAG/DROP into COMPLETED:
    if (movedIntoCompleted) {
      // preserve origin if we’re coming from a real quadrant
      if (current.quadrant !== 'COMPLETED') {
        next.previousQuadrantId = current.quadrant;
      }
      next.quadrant = 'COMPLETED';
      next.completed = true;
    }

    // 4) Dragging OUT of COMPLETED => treat as “uncomplete”
    if (movedOutOfCompleted) {
      next.quadrant = patch.quadrant as QuadrantId;
      next.completed = false;
      next.previousQuadrantId = undefined;
    }

    const updated = [...list];
    updated[idx] = next;
    this.set(updated);
  }

  /**
   * Delete a task
   *
   * @param id - The task ID to delete
   */
  deleteTask(id: string): void {
    this.set(this.snapshot.filter((t) => t.id !== id));
  }

  /**
   * Reorder tasks within a quadrant
   * Used by drag-drop to maintain task order
   *
   * @param quadrant - The quadrant containing the tasks
   * @param orderedIds - Array of task IDs in the desired order
   */
  setOrder(quadrant: QuadrantId, orderedIds: string[]): void {
    const byId = new Map(this.snapshot.map((t) => [t.id, t] as const));

    const quadrantTasks = orderedIds
      .map((id) => byId.get(id))
      .filter((t): t is Task => !!t)
      .map((t) => ({ ...t, quadrant, updatedAt: Date.now() }));

    const otherTasks = this.snapshot.filter((t) => t.quadrant !== quadrant);

    this.set([...otherTasks, ...quadrantTasks]);
  }

  /**
   * Internal: Update the task list and persist to storage
   * @private
   */
  private set(tasks: Task[]): void {
    this._tasks$.next(tasks);
    this.save(tasks);
  }

  /**
   * Internal: Load tasks from localStorage or return seed data
   * @private
   */
  private load(): Task[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!raw) return this.seed();
      const parsed = JSON.parse(raw) as Task[];
      return Array.isArray(parsed) ? parsed : this.seed();
    } catch {
      return this.seed();
    }
  }

  /**
   * Internal: Save tasks to localStorage
   * @private
   */
  private save(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  /**
   * Internal: Generate seed/demo tasks
   * @private
   */
  private seed(): Task[] {
    const now = Date.now();
    return [
      {
        id: 'seed_1',
        title: 'Drag me to a different quadrant',
        description: 'I’m a task. I move. Much like your deadlines.',
        tags: ['demo'],
        dueDate: undefined,
        completed: false,
        quadrant: 'UNCATEGORIZED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_2',
        title: 'Pay rent',
        description: 'A timeless classic.',
        tags: ['money'],
        dueDate: undefined,
        completed: false,
        quadrant: 'DO_NOW',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
