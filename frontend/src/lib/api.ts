/**
 * Thin API client. Base URL comes from VITE_API_URL (see .env.example),
 * falling back to the local backend dev server.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  service: string;
  supabase: 'configured' | 'not-configured';
  timestamp: string;
}
