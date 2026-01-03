import { QueryClient, QueryFunction } from "@tanstack/react-query";

function getCsrfToken(): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const name = trimmed.substring(0, eqIndex);
    const value = trimmed.substring(eqIndex + 1);
    if (name === "csrf_token") {
      return value;
    }
  }
  return null;
}

/**
 * Extract a human-readable error message from various error formats.
 * This handles JSON error responses, Error objects, and raw strings.
 */
export function getHumanReadableError(error: unknown, fallback = "An unexpected error occurred"): string {
  // Handle Error objects
  if (error instanceof Error) {
    return error.message || fallback;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    // Try to parse as JSON in case it's a stringified error object
    try {
      const parsed = JSON.parse(error);
      return extractMessageFromObject(parsed) || error || fallback;
    } catch {
      return error || fallback;
    }
  }
  
  // Handle object errors (like API response data)
  if (typeof error === 'object' && error !== null) {
    return extractMessageFromObject(error) || fallback;
  }
  
  return fallback;
}

function extractMessageFromObject(obj: any): string | null {
  // Common error message fields in priority order
  if (obj.message && typeof obj.message === 'string') return obj.message;
  if (obj.error && typeof obj.error === 'string') return obj.error;
  if (obj.detail && typeof obj.detail === 'string') return obj.detail;
  if (obj.errorMessage && typeof obj.errorMessage === 'string') return obj.errorMessage;
  
  // Handle array of errors (e.g., { errors: ["Error 1", "Error 2"] })
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const firstError = obj.errors[0];
    if (typeof firstError === 'string') return firstError;
    if (typeof firstError === 'object' && firstError.message) return firstError.message;
  }
  
  // Handle validation errors array (e.g., from Zod)
  if (Array.isArray(obj) && obj.length > 0) {
    const firstItem = obj[0];
    if (typeof firstItem === 'string') return firstItem;
    if (typeof firstItem === 'object' && firstItem.message) return firstItem.message;
  }
  
  // Don't return stringified objects - that looks like JSON to users
  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const rawText = (await res.text()) || res.statusText;
    const text = rawText.trim();
    
    // Try to parse JSON and extract human-readable message
    let errorMessage = text;
    try {
      const parsed = JSON.parse(text);
      errorMessage = extractMessageFromObject(parsed) || text;
    } catch {
      // Not JSON, use the raw text but clean it up
      errorMessage = text;
    }
    
    // If the error still looks like JSON, provide a generic message
    const trimmed = errorMessage.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      errorMessage = `Request failed with status ${res.status}`;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { timeoutMs?: number },
): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs || 30000; // Default 30 second timeout
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    };
    
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    const csrfToken = getCsrfToken();
    if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
      headers["x-csrf-token"] = csrfToken;
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
      cache: "no-store", // Aggressive cache-busting
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection and try again');
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        signal: controller.signal,
        cache: "no-store", // Aggressive cache-busting
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });

      clearTimeout(timeoutId);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection and try again');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch on mount to ensure fresh data
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
