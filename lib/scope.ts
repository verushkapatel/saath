/**
 * Everything a person saves is kept apart from everyone else who uses the same browser.
 * Small values in localStorage carry the account id as a suffix; the tracker has its own database per account.
 */
let scope = "";

export function setScope(id: string | null): void {
  scope = id ?? "";
}

export function currentScope(): string {
  return scope;
}

export function scoped(key: string): string {
  return scope ? `${key}:${scope}` : key;
}
