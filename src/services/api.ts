/**
 * WEWOO Hospital Emergency Command Center - Centralized Backend REST API Service
 * Connects directly to the Node.js + Express backend (default: http://localhost:5000/api/v1)
 */

const getApiBaseUrl = (): string => {
  const envUrl =
    (import.meta.env as any).NEXT_PUBLIC_API_URL ||
    import.meta.env.VITE_API_URL;

  // In browser on remote preview host, route via Vite proxy if envUrl points to localhost
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (!envUrl || envUrl.includes('localhost:') || envUrl.includes('127.0.0.1:')) {
      return '/api/v1';
    }
  }

  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export interface BackendHealthResponse {
  status: 'healthy' | 'degraded' | string;
  server: string;
  system: string;
  version: string;
  timestamp: string;
  uptimeSeconds?: number;
  database?: {
    status: 'connected' | 'error';
    latencyMs?: number;
    error?: string | null;
  };
  socket?: {
    status: 'active' | 'inactive';
    connectedClients?: number;
  };
  environment?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Token management in localStorage
const TOKEN_KEY = 'wewoo_jwt_access_token';
const REFRESH_TOKEN_KEY = 'wewoo_jwt_refresh_token';

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const parseJwtPayload = (token: string): any | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string | null, skewSeconds = 30): boolean => {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const expMs = payload.exp * 1000;
  return Date.now() >= expMs - skewSeconds * 1000;
};

// Singleton concurrency-safe token refresh lock
let refreshPromise: Promise<string | null> | null = null;

const authFailedListeners = new Set<() => void>();
const tokenRefreshedListeners = new Set<(newToken: string) => void>();

export const addAuthFailedListener = (cb: () => void): (() => void) => {
  authFailedListeners.add(cb);
  return () => authFailedListeners.delete(cb);
};

export const addTokenRefreshedListener = (cb: (token: string) => void): (() => void) => {
  tokenRefreshedListeners.add(cb);
  return () => tokenRefreshedListeners.delete(cb);
};

const notifyAuthFailed = () => {
  authFailedListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
};

const notifyTokenRefreshed = (token: string) => {
  tokenRefreshedListeners.forEach((cb) => {
    try {
      cb(token);
    } catch {
      // ignore
    }
  });
};

/**
 * Concurrency-safe token refresh.
 * Prevents multiple simultaneous refresh requests and duplicate socket connections.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const storedRefreshToken = getRefreshToken();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
        credentials: 'include',
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.data?.accessToken) {
        throw new Error(json?.message || 'Refresh token expired or invalid');
      }

      const newAccessToken = json.data.accessToken;
      setAccessToken(newAccessToken);

      if (json.data.refreshToken) {
        setRefreshToken(json.data.refreshToken);
      }

      notifyTokenRefreshed(newAccessToken);
      return newAccessToken;
    } catch (err: any) {
      console.warn('🔒 [WEWOO Auth] Refresh token renewal failed:', err.message);
      clearTokens();
      notifyAuthFailed();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Generic request helper with automatic JSON serialization, Bearer token injection,
 * proactive token renewal, and single-flight retry on 401.
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Proactive token check: renew if expired before firing request
  let token = getAccessToken();
  if (token && isTokenExpired(token, 30) && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = refreshed;
    }
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch (netErr: any) {
    throw new ApiError(
      `Cannot connect to WEWOO Backend at ${API_BASE_URL}. Please ensure the backend server is running.`,
      0,
      netErr
    );
  }

  // Handle Token Expiration (401) by attempting refresh and retrying once
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/login')
  ) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      try {
        response = await fetch(url, { ...options, headers, credentials: 'include' });
      } catch (retryErr: any) {
        throw new ApiError(
          `Retry failed after token renewal at ${API_BASE_URL}.`,
          0,
          retryErr
        );
      }
    }
  }

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      `Server returned invalid JSON response (HTTP ${response.status})`,
      response.status
    );
  }

  if (!response.ok || data.success === false) {
    throw new ApiError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      data.error
    );
  }

  return (data.data !== undefined ? data.data : data) as T;
}

// ============================================================================
// WEWOO REST API SERVICE METHODS
// ============================================================================

export const api = {
  // 1. Health check (Root /health or /api/v1/health with PostgreSQL & Socket.IO telemetry)
  checkHealth: async (): Promise<BackendHealthResponse> => {
    const rootBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const healthUrl = rootBase ? `${rootBase}/health` : `${API_BASE_URL}/health`;

    let res: Response;
    try {
      res = await fetch(healthUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      try {
        res = await fetch(`${API_BASE_URL}/health`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
      } catch (err: any) {
        throw new ApiError(
          `Cannot reach WEWOO Backend server at ${API_BASE_URL}. Connection timed out or server is offline.`,
          0,
          err
        );
      }
    }

    const json = await res.json().catch(() => null);
    if (!json) {
      throw new ApiError(`Invalid health check response from ${healthUrl}`, res.status);
    }
    return json as BackendHealthResponse;
  },

  // 2. Authentication
  login: async (email: string, pass: string) => {
    const data = await request<{
      user: { id: string; email: string; fullName: string; role: string; hospitalId?: string | null };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    if (data.accessToken) setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return data;
  },

  register: async (payload: {
    email: string;
    password: string;
    fullName: string;
    role?: 'HOSPITAL_ADMIN' | 'AMBULANCE_DRIVER' | 'SYSTEM_ADMIN';
    hospitalId?: string | null;
    phone?: string;
  }) => {
    const data = await request<{
      user: { id: string; email: string; fullName: string; role: string; hospitalId?: string | null };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        role: payload.role || 'HOSPITAL_ADMIN',
      }),
    });
    if (data.accessToken) setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return data;
  },

  getMe: async () => {
    return request<{
      id: string;
      email: string;
      fullName: string;
      role: string;
      hospitalId?: string | null;
      phone?: string;
    }>('/auth/me');
  },

  logout: async () => {
    try {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ refreshToken: refreshToken || undefined }),
        credentials: 'include',
      }).catch(() => null);
    } finally {
      clearTokens();
      notifyAuthFailed();
    }
  },

  // 3. Hospital Information & Details
  getAllHospitals: async () => {
    return request<any[]>('/hospitals');
  },

  getHospitalDetails: async (hospitalId: string) => {
    return request<any>(`/hospitals/${hospitalId}`);
  },

  updateHospitalDetails: async (hospitalId: string, details: any) => {
    return request<any>(`/hospitals/${hospitalId}/details`, {
      method: 'PATCH',
      body: JSON.stringify(details),
    });
  },

  updateSpecialities: async (hospitalId: string, specialities: any[]) => {
    return request<any>(`/hospitals/${hospitalId}/specialities`, {
      method: 'PUT',
      body: JSON.stringify({ specialities }),
    });
  },

  updateCapabilities: async (hospitalId: string, capabilities: any[]) => {
    return request<any>(`/hospitals/${hospitalId}/capabilities`, {
      method: 'PUT',
      body: JSON.stringify({ capabilities }),
    });
  },

  // 4. Hospital Resources & Auto-Balancing
  getResources: async (hospitalId: string) => {
    return request<any>(`/resources/${hospitalId}`);
  },

  updateResources: async (hospitalId: string, resources: any) => {
    return request<any>(`/resources/${hospitalId}`, {
      method: 'PUT',
      body: JSON.stringify(resources),
    });
  },

  // 5. Ambulances
  getAmbulances: async (hospitalId?: string) => {
    const query = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    return request<any[]>(`/ambulances${query}`);
  },

  getAmbulanceById: async (id: string) => {
    return request<any>(`/ambulances/${id}`);
  },

  // 6. Emergencies & Coordination
  getActiveEmergencies: async (hospitalId: string) => {
    return request<any[]>(`/emergencies/active?hospitalId=${encodeURIComponent(hospitalId)}`);
  },

  getEmergencyById: async (emergencyId: string) => {
    return request<any>(`/emergencies/${emergencyId}`);
  },

  createEmergency: async (payload: any) => {
    return request<any>('/emergencies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  respondEmergency: async (
    emergencyId: string,
    action: 'ACCEPT' | 'REJECT',
    extras?: { rejectionReason?: string; assignedDoctor?: string; prepInstructions?: string }
  ) => {
    return request<any>(`/emergencies/${emergencyId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action, ...extras }),
    });
  },

  updateEmergencyStatus: async (emergencyId: string, status: string, notes?: string) => {
    return request<any>(`/emergencies/${emergencyId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  getPreparationTasks: async (emergencyId: string) => {
    return request<any[]>(`/emergencies/${emergencyId}/tasks`);
  },

  addPreparationTask: async (emergencyId: string, taskTitle: string, category: string, assignedTo?: string) => {
    return request<any>(`/emergencies/${emergencyId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ taskTitle, category, assignedTo }),
    });
  },

  updatePreparationTask: async (emergencyId: string, taskId: number | string, isCompleted: boolean, assignedTo?: string) => {
    return request<any>(`/emergencies/${emergencyId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted, assignedTo }),
    });
  },

  getEmergencyHistory: async (hospitalId?: string) => {
    const query = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    return request<any[]>(`/emergencies/history${query}`);
  },
};
