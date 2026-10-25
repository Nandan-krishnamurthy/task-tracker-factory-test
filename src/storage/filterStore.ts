import { PRIORITY_FILTERS, type PriorityFilter } from '../domain/filter';

/**
 * The key the priority filter is remembered under (REQ-035), apart from the tasks: this
 * module never reads or writes `task-tracker:v1` (003-priority-filter decision 2).
 */
export const FILTER_KEY = 'task-tracker:priority-filter';

/**
 * Reads the remembered priority filter. A missing value, one that is not a filter choice,
 * or a read that throws gives "all" (REQ-036). Never throws.
 */
export function loadPriorityFilter(storage: Pick<Storage, 'getItem'>): PriorityFilter {
  try {
    const raw = storage.getItem(FILTER_KEY);
    return PRIORITY_FILTERS.find((filter) => filter === raw) ?? 'all';
  } catch {
    return 'all';
  }
}

/**
 * Remembers the priority filter (REQ-035); returns whether the write worked. A failed
 * write is reported, not thrown, and the caller ignores it (003-priority-filter decision 8).
 */
export function savePriorityFilter(storage: Pick<Storage, 'setItem'>, filter: PriorityFilter): boolean {
  try {
    storage.setItem(FILTER_KEY, filter);
    return true;
  } catch {
    return false;
  }
}
