const TOKEN_STORAGE_KEY = "rr_token";

export function saveAuthToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}
