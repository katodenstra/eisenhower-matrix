import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type MatrixTarget =
  | 'DO_NOW'
  | 'DO_LATER'
  | 'DELEGATE'
  | 'ELIMINATE'
  | 'GRID_VIEW'
  | 'UNCATEGORIZED'
  | 'COMPLETED';

@Injectable({ providedIn: 'root' })
export class UiEventsService {
  private expandMatrixSubject = new Subject<MatrixTarget>();
  expandMatrix$ = this.expandMatrixSubject.asObservable();

  expandMatrix(target: MatrixTarget): void {
    this.expandMatrixSubject.next(target);
  }
}
