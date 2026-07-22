// ---------------------------------------------------------------------------
// Global change notification — frontend polls this to know when to refresh
// ---------------------------------------------------------------------------

let _changeVersion = 0;

export function notifyChange(): void {
  _changeVersion++;
}

export function getChangeVersion(): number {
  return _changeVersion;
}
