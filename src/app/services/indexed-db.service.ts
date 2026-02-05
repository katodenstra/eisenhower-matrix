import { Injectable } from '@angular/core';
import { Task, QuadrantId } from '../models/task.models';

/**
 * IndexedDB Service
 *
 * Provides persistent storage for tasks using browser's IndexedDB API.
 * Handles:
 * - Database initialization and schema management
 * - CRUD operations with async/await
 * - Automatic migrations
 * - Query operations by quadrant or ID
 *
 * Database schema:
 * - Store: 'tasks'
 *   - keyPath: 'id'
 *   - indexes: 'quadrant', 'completed'
 */
@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private dbName = 'eisenhower-matrix-db';
  private storeName = 'tasks';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   * Called once on app startup
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('quadrant', 'quadrant', { unique: false });
          store.createIndex('completed', 'completed', { unique: false });
        }
      };
    });
  }

  /**
   * Add a single task
   */
  async addTask(task: Task): Promise<void> {
    return this.withStore('readwrite', async (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(task);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    });
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Task[]> {
    return this.withStore('readonly', async (store) => {
      return new Promise<Task[]>((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as Task[]);
      });
    });
  }

  /**
   * Update an existing task
   */
  async updateTask(task: Task): Promise<void> {
    return this.withStore('readwrite', async (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(task);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    });
  }

  /**
   * Delete a task by ID
   */
  async deleteTask(id: string): Promise<void> {
    return this.withStore('readwrite', async (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    });
  }

  /**
   * Clear all tasks
   */
  async clearAll(): Promise<void> {
    return this.withStore('readwrite', async (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    });
  }

  /**
   * Helper to execute a transaction
   * @private
   */
  private async withStore<T>(
    mode: 'readonly' | 'readwrite',
    callback: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }

    const transaction = this.db.transaction(this.storeName, mode);
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      callback(store)
        .then((result) => {
          transaction.oncomplete = () => resolve(result);
        })
        .catch((error) => {
          transaction.onerror = () => reject(error);
        });
    });
  }
}
