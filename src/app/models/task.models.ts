export type QuadrantId =
  | 'DO_NOW'
  | 'DO_LATER'
  | 'DELEGATE'
  | 'ELIMINATE'
  | 'UNCATEGORIZED'
  | 'COMPLETED';

export interface Task {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (24-hour format)
  completed: boolean;
  quadrant: QuadrantId;
  previousQuadrantId?: QuadrantId;
  createdAt: number;
  updatedAt: number;
}

export interface QuadrantMeta {
  id: Exclude<QuadrantId, 'UNCATEGORIZED'>;
  title: string;
  subtitle: string;
  bg: string;
  border: string;
}

export const QUADRANTS: QuadrantMeta[] = [
  {
    id: 'DO_NOW',
    title: 'Urgent & Important',
    subtitle: 'Do now',
    bg: 'var(--quadrant-do-now-bg)',
    border: 'var(--quadrant-do-now-border)',
  },
  {
    id: 'DO_LATER',
    title: 'Urgent & Not Important',
    subtitle: 'Do later',
    bg: 'var(--quadrant-do-later-bg)',
    border: 'var(--quadrant-do-later-border)',
  },
  {
    id: 'DELEGATE',
    title: 'Important & Not Urgent',
    subtitle: 'Delegate',
    bg: 'var(--quadrant-delegate-bg)',
    border: 'var(--quadrant-delegate-border)',
  },
  {
    id: 'ELIMINATE',
    title: 'Not Urgent & Not Important',
    subtitle: 'Eliminate',
    bg: 'var(--quadrant-eliminate-bg)',
    border: 'var(--quadrant-eliminate-border)',
  },
];
