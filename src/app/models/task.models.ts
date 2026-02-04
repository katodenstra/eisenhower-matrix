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
    bg: '#1d3b2a22', // pale green tint
    border: '#2fc06a', // dark green
  },
  {
    id: 'DO_LATER',
    title: 'Urgent & Not Important',
    subtitle: 'Do later',
    bg: '#16324a22', // pale blue tint
    border: '#4aa3ff', // dark blue
  },
  {
    id: 'DELEGATE',
    title: 'Important & Not Urgent',
    subtitle: 'Delegate',
    bg: '#4a3b1622', // pale mustard tint
    border: '#f2c94c', // mustard
  },
  {
    id: 'ELIMINATE',
    title: 'Not Urgent & Not Important',
    subtitle: 'Eliminate',
    bg: '#4a161622', // pale red tint
    border: '#ff5c5c', // dark red
  },
];
