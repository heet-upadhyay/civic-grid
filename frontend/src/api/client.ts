const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || '';
// Ensure no trailing slash so ${API_BASE}${endpoint} is always well-formed
export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

// Callback for handling auth errors (401) - will be set by RoleContext
let onAuthError: (() => void) | null = null;

export const setAuthErrorHandler = (handler: () => void) => {
  onAuthError = handler;
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3,
  delayMs = 2000,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('civicgrid_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const body = await response.json();
          if (body?.detail) errorDetail = body.detail;
        } catch {
          // use statusText fallback
        }

        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          // Clear auth data and trigger logout
          localStorage.removeItem('civicgrid_token');
          localStorage.removeItem('civicgrid_user_profile');
          localStorage.removeItem('civicgrid_role');
          localStorage.removeItem('civicgrid_officer_profile');
          
          // Call the auth error handler if registered
          if (onAuthError) {
            onAuthError();
          }
          
          throw new Error('Session expired. Please log in again.');
        }

        // Retry on 502/503/504 gateway timeouts caused by Render cold start
        if ([502, 503, 504].includes(response.status) && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
          continue;
        }

        throw new Error(`API Error (${response.status}): ${errorDetail}`);
      }

      return await response.json();
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error && (error.message.includes('fetch') || error.message.includes('NetworkError')));

      if (isNetworkError && attempt < retries) {
        // Wait before retrying (Render cold start wakeup delay)
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }

      if (isNetworkError) {
        throw new Error(
          `Failed to connect to backend server at ${url || 'API'}. Render free host may be waking up from sleep (~30 seconds). Please click Try Again.`
        );
      }
      throw error;
    }
  }

  throw new Error(`Failed to fetch from ${url} after ${retries} retries.`);
}
