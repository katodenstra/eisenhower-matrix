import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task, QuadrantId } from '../models/task.models';
import { IdService } from './id.service';
import { IndexedDbService } from './indexed-db.service';
import { STORAGE_KEYS } from '../constants/constants';

/**
 * Task Store Service
 *
 * Centralized state management for all tasks in the application.
 * Handles:
 * - Task CRUD operations
 * - Task state transitions (completion, quadrant movement)
 * - IndexedDB persistence with localStorage fallback
 * - Observable stream for reactive updates
 * - Loading and syncing state signals for skeleton screens
 *
 * Important: Always maintains referential integrity for tasks within each quadrant
 * to ensure CDK drag-drop functionality works correctly.
 */
@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  /** Observable stream of task list changes */
  private readonly _tasks$ = new BehaviorSubject<Task[]>([]);
  readonly tasks$ = this._tasks$.asObservable();

  /** Loading state for skeleton screens */
  loading = signal(false);

  /** Syncing state for persisting changes */
  syncing = signal(false);

  constructor(
    private ids: IdService,
    private db: IndexedDbService,
  ) {
    this.initializeStore();
  }

  /**
   * Initialize the store by loading from IndexedDB or falling back to localStorage
   * @private
   */
  private async initializeStore(): Promise<void> {
    this.loading.set(true);
    try {
      await this.db.init();
      const tasks = await this.db.getAllTasks();

      if (tasks.length === 0) {
        // If IndexedDB is empty, seed with demo data
        const seedTasks = this.seed();
        for (const task of seedTasks) {
          await this.db.addTask(task);
        }
        this._tasks$.next(seedTasks);
      } else {
        this._tasks$.next(tasks);
      }
    } catch (error) {
      console.error('Failed to initialize IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      this._tasks$.next(this.loadFromLocalStorage());
    } finally {
      this.loading.set(false);
    }
  }

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
   * Internal: Update the task list and persist to both stores
   * @private
   */
  private async set(tasks: Task[]): Promise<void> {
    this._tasks$.next(tasks);
    this.syncing.set(true);
    try {
      // Persist to IndexedDB
      for (const task of tasks) {
        await this.db.updateTask(task);
      }
      // Also update localStorage as fallback
      this.saveToLocalStorage(tasks);
    } catch (error) {
      console.error('Failed to sync to IndexedDB:', error);
      // Still update localStorage as fallback
      this.saveToLocalStorage(tasks);
    } finally {
      this.syncing.set(false);
    }
  }

  /**
   * Internal: Load tasks from localStorage or return seed data
   * @private
   */
  private loadFromLocalStorage(): Task[] {
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
  private saveToLocalStorage(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * Internal: Generate seed/demo tasks
   * @private
   */
  private seed(): Task[] {
    const now = Date.now();
    return [
      // DO_NOW - Urgent & Important (Red)
      {
        id: 'seed_1',
        title: 'Fix critical bug in production',
        description: 'Production is down, customers are waiting. This needs immediate attention.',
        tags: ['urgent', 'bug', 'production'],
        dueDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
        dueTime: '09:00',
        completed: false,
        quadrant: 'DO_NOW',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_2',
        title: 'Pay rent',
        description: 'Monthly rent payment due. Set reminder for automatic transfer.',
        tags: ['money', 'recurring'],
        dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        dueTime: undefined,
        completed: false,
        quadrant: 'DO_NOW',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_3',
        title: 'Client meeting - Project kickoff',
        description: 'Discuss project requirements and timeline with the client team.',
        tags: ['meeting', 'client', 'important'],
        dueDate: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        dueTime: '14:00',
        completed: false,
        quadrant: 'DO_NOW',
        createdAt: now,
        updatedAt: now,
      },

      // DO_LATER - Not Urgent but Important (Blue)
      {
        id: 'seed_4',
        title: 'Learn TypeScript advanced patterns',
        description: 'Deep dive into generics, decorators, and utility types. Invest in skills.',
        tags: ['learning', 'development'],
        dueDate: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks
        dueTime: undefined,
        completed: false,
        quadrant: 'DO_LATER',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_5',
        title: 'Refactor authentication module',
        description: 'Update to OAuth2 with proper token refresh handling.',
        tags: ['refactor', 'security'],
        dueDate: new Date(now + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 weeks
        dueTime: undefined,
        completed: false,
        quadrant: 'DO_LATER',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_6',
        title: 'Plan vacation for Q2',
        description: 'Research destinations, check flight prices, book accommodations.',
        tags: ['personal', 'planning'],
        dueDate: new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months
        dueTime: undefined,
        completed: false,
        quadrant: 'DO_LATER',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_7',
        title: 'Update portfolio with latest projects',
        description: 'Add IndexedDB project, update skills section, refresh testimonials.',
        tags: ['career', 'portfolio'],
        dueDate: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days
        dueTime: undefined,
        completed: false,
        quadrant: 'DO_LATER',
        createdAt: now,
        updatedAt: now,
      },

      // DELEGATE - Urgent but Not Important (Yellow)
      {
        id: 'seed_8',
        title: 'Review junior dev pull requests',
        description: 'Code review for the features branch. Assign feedback and approval.',
        tags: ['review', 'team'],
        dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days
        dueTime: '10:00',
        completed: false,
        quadrant: 'DELEGATE',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_9',
        title: 'Prepare expense report',
        description: 'Compile receipts and submit monthly expenses for reimbursement.',
        tags: ['admin', 'finance'],
        dueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days
        dueTime: undefined,
        completed: false,
        quadrant: 'DELEGATE',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_10',
        title: 'Schedule team building event',
        description: 'Book venue, send invitations, arrange catering.',
        tags: ['team', 'event'],
        dueDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week
        dueTime: undefined,
        completed: false,
        quadrant: 'DELEGATE',
        createdAt: now,
        updatedAt: now,
      },

      // ELIMINATE - Not Urgent & Not Important (Gray)
      {
        id: 'seed_11',
        title: 'Organize computer files',
        description: 'Clean up Downloads folder, organize project directories.',
        tags: ['maintenance'],
        dueDate: undefined,
        dueTime: undefined,
        completed: false,
        quadrant: 'ELIMINATE',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_12',
        title: 'Reply to old emails',
        description: 'Go through archived emails and respond to pending items.',
        tags: ['communication'],
        dueDate: undefined,
        dueTime: undefined,
        completed: false,
        quadrant: 'ELIMINATE',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed_13',
        title: 'Reorganize bookshelf',
        description: 'Alphabetize books or arrange by category.',
        tags: ['personal', 'optional'],
        dueDate: undefined,
        dueTime: undefined,
        completed: false,
        quadrant: 'ELIMINATE',
        createdAt: now,
        updatedAt: now,
      },

      // UNCATEGORIZED - Demo task
      {
        id: 'seed_14',
        title: 'Drag me to a different quadrant',
        description: 'I am a task. I move. Much like your deadlines. Drag me to categorize!',
        tags: ['demo'],
        dueDate: undefined,
        dueTime: undefined,
        completed: false,
        quadrant: 'UNCATEGORIZED',
        createdAt: now,
        updatedAt: now,
      },

      // COMPLETED - Show a completed example
      {
        id: 'seed_15',
        title: 'Deploy version 2.0 to production',
        description: 'Released successfully with all features working as expected.',
        tags: ['deployment', 'milestone'],
        dueDate: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        dueTime: undefined,
        completed: true,
        quadrant: 'COMPLETED',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
