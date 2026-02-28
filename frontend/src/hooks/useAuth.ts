const SESSION_KEY = 'luidfiles_session';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return !!getSessionToken();
}
