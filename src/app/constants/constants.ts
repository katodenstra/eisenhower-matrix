/**
 * Application-wide Constants
 * Configuration values, magic numbers, and reusable constants
 */

// ===== BREAKPOINTS =====
export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  DESKTOP: 900,
  WIDE: 1200,
} as const;

// ===== ANIMATION TIMINGS (milliseconds) =====
export const ANIMATION_TIMINGS = {
  FAST: 120,
  BASE: 200,
  SMOOTH: 220,
  SLOW: 300,
  GRID: 420,
  POPOVER: 150,
} as const;

// ===== EASING FUNCTIONS =====
export const EASING = {
  LINEAR: 'linear',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  ELASTIC: 'cubic-bezier(0.2, 0.85, 0.2, 1)',
} as const;

// ===== GRID CONFIGURATION =====
export const GRID_CONFIG = {
  GAP_DESKTOP: 14,
  GAP_TABLET: 10,
  GAP_MOBILE: 8,
  STRIP_SIZE: 70, // minimum column/row size when collapsed
  HEIGHT_DESKTOP: '72vh',
  HEIGHT_MIN: '560px',
  HEIGHT_MAX: '660px',
  ANIMATION: `grid-template-columns ${ANIMATION_TIMINGS.GRID}ms ${EASING.ELASTIC}, grid-template-rows ${ANIMATION_TIMINGS.GRID}ms ${EASING.ELASTIC}`,
} as const;

// ===== COMPONENT SIZING =====
export const SIZES = {
  TOUCH_TARGET: 44,
  ICON_BUTTON: 40,
  HEADER_MIN_HEIGHT: 44,
  TASK_CARD_MIN_HEIGHT: 64,
  INBOX_CARD_HEIGHT: 92,
  INBOX_GAP: 10,
  INBOX_MAX_VISIBLE: 3, // max visible inbox cards
} as const;

// ===== SPACING VALUES (pixels) =====
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  '2XL': 24,
  '3XL': 32,
} as const;

// ===== RADIUS VALUES (pixels) =====
export const BORDER_RADIUS = {
  SM: 8,
  MD: 12,
  LG: 14,
  XL: 18,
} as const;

// ===== FONT SIZES (pixels) =====
export const FONT_SIZES = {
  XS: 10,
  SM: 12,
  MD: 14,
  LG: 16,
  XL: 18,
  '2XL': 22,
  '3XL': 28,
} as const;

// ===== Z-INDEX SCALE =====
export const Z_INDEX = {
  BASE: 0,
  ELEVATED: 1,
  MODAL: 10,
  POPOVER: 20,
  TOOLTIP: 30,
} as const;

// ===== DOM IDs & SELECTORS =====
export const DOM_IDS = {
  QUADRANT_PREFIX: 'quadrant-',
  TASK_PREFIX: 'task-',
  DATE_PICKER_BACKDROP: 'date-picker-backdrop',
  TASK_EDITOR_MODAL: 'task-editor-modal',
} as const;

// ===== ACCESSIBILITY =====
export const A11Y = {
  FOCUS_OUTLINE_WIDTH: 2,
  FOCUS_OUTLINE_OFFSET: 2,
  LIVE_REGION_POLITE: 'polite',
  LIVE_REGION_ASSERTIVE: 'assertive',
} as const;

// ===== KEYBOARD NAVIGATION =====
export const KEYBOARD = {
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
} as const;

// ===== STORAGE KEYS =====
export const STORAGE_KEYS = {
  TASKS: 'eisenhower_tasks_v1',
  UI_STATE: 'eisenhower_ui_state',
} as const;

// ===== FEATURE FLAGS =====
export const FEATURES = {
  ENABLE_KEYBOARD_NAVIGATION: true,
  ENABLE_OPTIMISTIC_UPDATES: true,
  ENABLE_ANIMATIONS: true,
  DEBUG_LOGS: false,
} as const;

// ===== DATE FORMATTING =====
/**
 * Formats an ISO date string (YYYY-MM-DD) to dd/mm/yyyy format
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string in dd/mm/yyyy format, or empty string if invalid
 */
export function formatDateDDMMYYYY(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}
