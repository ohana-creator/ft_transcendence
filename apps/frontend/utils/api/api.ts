/**
 * API Client para comunicação com o backend
 * Suporta autenticação JWT e query parameters
 */

export interface ApiError {
  status: number;
  message: string | string[];
  errors?: Record<string, string[]>;
}

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  signal?: AbortSignal;
}

const TOKEN_KEY = 'vaks_access_token';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // ── Token Management ──────────────────────────────────

  private static decodeJwtPayload(token: string): { exp?: number } | null {
    try {
      if (typeof window === 'undefined') return null;

      const parts = token.split('.');
      if (parts.length < 2) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const payload = ApiClient.decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      // Token malformado ou sem exp deve ser tratado como inválido.
      return true;
    }
    return Date.now() >= payload.exp * 1000;
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    if (ApiClient.isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return token;
  }

  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  }

  static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  }

  static isAuthenticated(): boolean {
    return !!ApiClient.getToken();
  }

  // ── Base URL ──────────────────────────────────────────

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ── Request Helpers ───────────────────────────────────

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${base}${path}`;

    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          search.append(key, String(value));
        }
      });
    }

    const query = search.toString();
    if (!query) return url;
    return `${url}${url.includes('?') ? '&' : '?'}${query}`;
  }

  private buildHeaders(options?: RequestOptions, hasBody: boolean = true): HeadersInit {
    const headers: Record<string, string> = {
      ...options?.headers,
    };

    // Apenas adiciona Content-Type se há body
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    if (!options?.skipAuth) {
      const token = ApiClient.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private shouldSilenceBackendRequest(url: string): boolean {
    if (typeof window === 'undefined') return false;

    const shouldSilence = process.env.NEXT_PUBLIC_SILENCE_BACKEND_REQUESTS === 'true';
    if (!shouldSilence) return false;

    try {
      const parsed = new URL(url, window.location.href);
      const blockedHosts = new Set([
        'localhost:3003',
        '127.0.0.1:3003',
      ]);
      return blockedHosts.has(parsed.host);
    } catch {
      return false;
    }
  }

  private buildSilentMockResponse<T>(endpoint: string, method: string): T {
    const normalizedEndpoint = endpoint.toLowerCase();

    if (method === 'GET' && normalizedEndpoint.startsWith('/wallet/transactions')) {
      return [] as T;
    }

    if (method === 'GET' && normalizedEndpoint === '/wallet/balance') {
      return {
        balance: 0,
        currency: 'VAKS',
      } as T;
    }

    if (method === 'GET' && normalizedEndpoint === '/wallet') {
      return {
        id: 'mock-wallet',
        userId: 'mock-user',
        campaignId: null,
        balance: 0,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      } as T;
    }

    if (method === 'GET' && normalizedEndpoint.startsWith('/campaigns')) {
      return {
        campaigns: [],
        meta: { total: 0 },
      } as T;
    }

    if (method === 'GET' && normalizedEndpoint.includes('/invitations/pending')) {
      return {
        data: [],
        invitations: [],
        success: true,
      } as T;
    }

    return {
      success: true,
      data: [],
      meta: { total: 0 },
    } as T;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiError = {
        status: response.status,
        message: `API error: ${response.status}`,
      };

      try {
        const body = await response.json();
        const normalizedMessage = Array.isArray(body.message)
          ? body.message.join(' | ')
          : (body.message || errorData.message);

        errorData = {
          status: response.status,
          message: normalizedMessage,
          errors: body.errors,
        };
      } catch {
        // Response body not JSON
      }

      // Handle 401 - token expired/invalid
      if (response.status === 401) {
        ApiClient.removeToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      }

      throw errorData;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ── HTTP Methods ──────────────────────────────────────

  async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    if (this.shouldSilenceBackendRequest(url)) {
      return this.buildSilentMockResponse<T>(endpoint, 'GET');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(options, false),
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    if (this.shouldSilenceBackendRequest(url)) {
      return this.buildSilentMockResponse<T>(endpoint, 'POST');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(options, !!data),
      body: data ? JSON.stringify(data) : undefined,
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    if (this.shouldSilenceBackendRequest(url)) {
      return this.buildSilentMockResponse<T>(endpoint, 'PUT');
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.buildHeaders(options, !!data),
      body: data ? JSON.stringify(data) : undefined,
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    if (this.shouldSilenceBackendRequest(url)) {
      return this.buildSilentMockResponse<T>(endpoint, 'PATCH');
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.buildHeaders(options, !!data),
      body: data ? JSON.stringify(data) : undefined,
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    if (this.shouldSilenceBackendRequest(url)) {
      return this.buildSilentMockResponse<T>(endpoint, 'DELETE');
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(options, false),
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }
}

// Instância global para campaigns via API Gateway (porta 3000)
export const campaignsApi = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
);

// Instância global via API Gateway (porta 3000)
export const api = new ApiClient();
