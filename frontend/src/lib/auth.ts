const TOKEN_STORAGE_KEY = "rr_token";

export function saveAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}
