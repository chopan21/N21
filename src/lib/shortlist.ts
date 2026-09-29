import { useSyncExternalStore } from "react";

const KEY = "n21.shortlist";
export const MAX_SHORTLIST = 6;

export interface ShortlistItem {
  postcode: string;
  label: string;
  addedAt: string;
}

const listeners = new Set<() => void>();
let snapshot: ShortlistItem[] = read();

function read(): ShortlistItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((i) => typeof i?.postcode === "string") : [];
  } catch {
    return [];
  }
}

function write(items: ShortlistItem[]) {
  snapshot = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage can be unavailable (private browsing); the shortlist still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useShortlist() {
  const items = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return {
    items,
    has: (postcode: string) => items.some((i) => i.postcode === postcode),
    isFull: items.length >= MAX_SHORTLIST,
    add: (postcode: string, label: string) => {
      if (items.some((i) => i.postcode === postcode) || items.length >= MAX_SHORTLIST) return;
      write([...items, { postcode, label, addedAt: new Date().toISOString() }]);
    },
    remove: (postcode: string) => write(items.filter((i) => i.postcode !== postcode)),
    clear: () => write([]),
  };
}
