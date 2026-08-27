import { clearAuthToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
};

function buildHeaders(options: RequestOptions): HeadersInit {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(options),
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });

  let payload: { error?: { message?: string }; data?: unknown } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error(payload?.error?.message ?? "API request failed.");
  }

  return payload?.data as T;
}

export async function apiDownload(path: string, token: string) {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401) clearAuthToken();
    let message = "Could not download the file.";
    try {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      message = payload.error?.message ?? message;
    } catch {}
    throw new Error(message);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename =
    disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "reference";
  return { blob: await response.blob(), filename };
}
