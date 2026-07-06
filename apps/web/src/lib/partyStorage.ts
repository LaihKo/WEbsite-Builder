// Casual, unauthenticated player identity for the party game — playerId is
// a bare cuid, not a secret token; this just lets a browser remember "which
// seat is mine" for a given game code across refreshes.

function key(code: string): string {
  return `party:${code.toUpperCase()}:playerId`;
}

export function savePlayerId(code: string, playerId: string): void {
  window.localStorage.setItem(key(code), playerId);
}

export function loadPlayerId(code: string): string | null {
  return window.localStorage.getItem(key(code));
}

export function clearPlayerId(code: string): void {
  window.localStorage.removeItem(key(code));
}
