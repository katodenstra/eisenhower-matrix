import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IdService {
  /** Good enough for demo: short, readable, collision-resistant-ish. */
  makeId(prefix = 't'): string {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }
}
