import type { Event, Page, Run } from "./types";

// In-memory, per-origin cache of the alert list. The side panel is one document
// shared across every tab, so switching tabs re-keys the list by the active
// tab's origin (see ListAlerts). Without a cache that means a network refetch on
// every tab switch; with it, a previously-loaded origin renders instantly.
//
// Scope is the panel session (cleared when the panel is closed/reopened).
// Entries are invalidated when alerts change on that origin — create/edit go
// through `completeSave`, which calls `invalidateAlerts`; in-place edits
// (disable, reactivate) mutate the same objects the cache holds, so they stay
// consistent without an explicit invalidation.
export interface CachedAlerts {
  events: Page<Event>;
  runs: Page<Run>;
}

const cache = new Map<string, CachedAlerts>();

export function getCachedAlerts(domain: string): CachedAlerts | undefined {
  return cache.get(domain);
}

export function setCachedAlerts(domain: string, data: CachedAlerts): void {
  cache.set(domain, data);
}

export function invalidateAlerts(domain: string): void {
  cache.delete(domain);
}
