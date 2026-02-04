/**
 * Matrix State Service
 * Centralized state management for the Eisenhower matrix layout and expansion
 * Handles grid calculation, expanded quadrant logic, and provides computed styles
 */

import { Injectable, computed, signal } from '@angular/core';
import { QuadrantId } from '../models/task.models';
import { GRID_CONFIG, SIZES } from '../constants/constants';

export interface GridStyle {
  '--col1': string;
  '--col2': string;
  '--row1': string;
  '--row2': string;
  '--grid-gap': string;
}

@Injectable({
  providedIn: 'root',
})
export class MatrixStateService {
  /**
   * The currently expanded quadrant (null if none expanded)
   * Only expandable quadrants can be expanded (not UNCATEGORIZED or COMPLETED)
   */
  private readonly expandedQuadrantId = signal<Exclude<
    QuadrantId,
    'UNCATEGORIZED' | 'COMPLETED'
  > | null>(null);

  /**
   * Computed grid style values for CSS custom properties
   * Animated when expansion state changes
   */
  readonly gridStyle = computed(() => {
    const expanded = this.expandedQuadrantId();
    const strip = `${GRID_CONFIG.STRIP_SIZE}px`;
    const gap = `${GRID_CONFIG.GAP_DESKTOP}px`;

    if (!expanded) {
      // Default: 2x2 grid
      return {
        '--col1': '1fr',
        '--col2': '1fr',
        '--row1': '1fr',
        '--row2': '1fr',
        '--grid-gap': gap,
      } as GridStyle;
    }

    // One quadrant expanded: it gets 2fr, others get strip
    const expanded_size = '2fr';
    const collapsed_size = strip;

    switch (expanded) {
      case 'DO_NOW':
        return {
          '--col1': expanded_size,
          '--col2': collapsed_size,
          '--row1': expanded_size,
          '--row2': collapsed_size,
          '--grid-gap': gap,
        } as GridStyle;

      case 'DO_LATER':
        return {
          '--col1': collapsed_size,
          '--col2': expanded_size,
          '--row1': expanded_size,
          '--row2': collapsed_size,
          '--grid-gap': gap,
        } as GridStyle;

      case 'DELEGATE':
        return {
          '--col1': expanded_size,
          '--col2': collapsed_size,
          '--row1': collapsed_size,
          '--row2': expanded_size,
          '--grid-gap': gap,
        } as GridStyle;

      case 'ELIMINATE':
        return {
          '--col1': collapsed_size,
          '--col2': expanded_size,
          '--row1': collapsed_size,
          '--row2': expanded_size,
          '--grid-gap': gap,
        } as GridStyle;

      default:
        return {
          '--col1': '1fr',
          '--col2': '1fr',
          '--row1': '1fr',
          '--row2': '1fr',
          '--grid-gap': gap,
        } as GridStyle;
    }
  });

  /**
   * Public readonly signal to check expanded state from components
   */
  readonly expandedId = this.expandedQuadrantId.asReadonly();

  /**
   * Toggle the expansion state of a quadrant
   * If the same quadrant is expanded again, it collapses
   * If a different quadrant is expanded, it replaces the current one
   *
   * @param quadrantId - The quadrant ID to toggle
   */
  toggleExpanded(quadrantId: Exclude<QuadrantId, 'UNCATEGORIZED' | 'COMPLETED'>): void {
    const current = this.expandedQuadrantId();

    if (current === quadrantId) {
      // Collapse if clicking the same quadrant
      this.expandedQuadrantId.set(null);
    } else {
      // Expand the new quadrant
      this.expandedQuadrantId.set(quadrantId);
    }
  }

  /**
   * Set the expanded quadrant directly
   * Used for programmatic control
   *
   * @param quadrantId - The quadrant to expand, or null to collapse all
   */
  setExpanded(quadrantId: Exclude<QuadrantId, 'UNCATEGORIZED' | 'COMPLETED'> | null): void {
    this.expandedQuadrantId.set(quadrantId);
  }

  /**
   * Collapse all expanded quadrants
   */
  collapseAll(): void {
    this.expandedQuadrantId.set(null);
  }

  /**
   * Check if a specific quadrant is expanded
   *
   * @param quadrantId - The quadrant ID to check
   * @returns true if the quadrant is expanded
   */
  isExpanded(quadrantId: QuadrantId): boolean {
    if (quadrantId === 'UNCATEGORIZED' || quadrantId === 'COMPLETED') {
      return false; // These quadrants cannot be expanded
    }
    return this.expandedQuadrantId() === (quadrantId as any);
  }

  /**
   * Check if a specific quadrant is shrunk (another is expanded)
   * Inbox quadrants are never shrunk
   *
   * @param quadrantId - The quadrant ID to check
   * @returns true if the quadrant is shrunk
   */
  isShrunk(quadrantId: QuadrantId): boolean {
    if (quadrantId === 'UNCATEGORIZED' || quadrantId === 'COMPLETED') {
      return false; // Inbox quadrants never shrink
    }
    const expanded = this.expandedQuadrantId();
    return expanded !== null && expanded !== quadrantId;
  }
}
