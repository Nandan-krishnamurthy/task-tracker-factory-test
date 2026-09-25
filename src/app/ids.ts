let counter = 0;

/** A unique task id: a UUID where the browser allows it, else time plus a counter. */
export function newId(): string {
  // randomUUID exists only in secure contexts; the app may be opened over file:// or HTTP.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}
