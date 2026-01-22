import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task, QuadrantId } from '../models/task.models';
import { IdService } from './id.service';

const STORAGE_KEY = 'eisenhower_tasks_v1';

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private readonly _tasks$ = new BehaviorSubject<Task[]>(this.load());
  readonly tasks$ = this._tasks$.asObservable();

  constructor(private ids: IdService) {}

  get snapshot(): Task[] {
    return this._tasks$.value;
  }

  createTask(partial: Pick<Task, 'title' | 'quadrant'> & Partial<Task>): Task {
    const now = Date.now();
    const task: Task = {
      id: this.ids.makeId('task'),
      title: partial.title.trim(),
      description: partial.description?.trim() ?? '',
      tags: partial.tags ?? [],
      dueDate: partial.dueDate,
      completed: false,
      quadrant: partial.quadrant,
      createdAt: now,
      updatedAt: now,
    };

    this.set([...this.snapshot, task]);
    return task;
  }

  updateTask(id: string, patch: Partial<Task>): void {
    const next = this.snapshot.map((t) => {
      if (t.id !== id) return t;
      return { ...t, ...patch, updatedAt: Date.now() };
    });
    this.set(next);
  }

  deleteTask(id: string): void {
    this.set(this.snapshot.filter((t) => t.id !== id));
  }

  /** Reorder tasks inside a quadrant by a provided ordered list of task IDs. */
  setOrder(quadrant: QuadrantId, orderedIds: string[]): void {
    const byId = new Map(this.snapshot.map((t) => [t.id, t] as const));

    const quadrantTasks = orderedIds
      .map((id) => byId.get(id))
      .filter((t): t is Task => !!t)
      .map((t) => ({ ...t, quadrant, updatedAt: Date.now() }));

    const otherTasks = this.snapshot.filter((t) => t.quadrant !== quadrant);

    this.set([...otherTasks, ...quadrantTasks]);
  }

  private set(tasks: Task[]): void {
    this._tasks$.next(tasks);
    this.save(tasks);
  }

  private load(): Task[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.seed();
      const parsed = JSON.parse(raw) as Task[];
      return Array.isArray(parsed) ? parsed : this.seed();
    } catch {
      return this.seed();
    }
  }

  private save(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  private seed(): Task[] {
    // A tiny seed so the UI doesn't look dead on first run.
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
