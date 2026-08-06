/**
 * Thin API client. Base URL comes from VITE_API_URL (see .env.example),
 * falling back to the local backend dev server. All requests send cookies
 * (`credentials: 'include'`) so the httpOnly session cookie flows to the API.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Let the browser set the multipart boundary for FormData bodies; only force
  // JSON for everything else.
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    let body: unknown = undefined;
    try {
      body = await res.json();
      if ((body as { message?: string })?.message) {
        message = (body as { message: string }).message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status, body);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });
/** Multipart upload (FormData) — used for favourite-item photos. */
export const apiUpload = <T>(path: string, formData: FormData) =>
  request<T>(path, { method: 'POST', body: formData });

// --- Shared response types -------------------------------------------------

export interface HealthResponse {
  status: string;
  service: string;
  supabase: 'configured' | 'not-configured';
  google: 'configured' | 'not-configured';
  timestamp: string;
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  tasteTags: string[];
  manualLocation: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  cuisineTags: string[];
  createdBy: string | null;
  createdAt: string;
}

/** A fuzzy-dedup candidate returned when adding a possibly-duplicate place. */
export interface RestaurantMatch {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  cuisineTags: string[];
  nameSimilarity: number;
  distanceM: number | null;
}

/** Google Maps deep link (Content.md §4) — static-map-free, cross-platform. */
export function googleMapsUrl(r: Pick<Restaurant, 'name' | 'address' | 'lat' | 'lng'>): string {
  const q =
    r.lat != null && r.lng != null
      ? `${r.lat},${r.lng}`
      : [r.name, r.address].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

// --- Reviews ---------------------------------------------------------------

export interface Ratings {
  food: number | null;
  service: number | null;
  price: number | null;
  ambiance: number | null;
}

export interface FavouriteItem {
  id: string;
  itemName: string;
  note: string | null;
  photoUrl: string | null;
}

export interface ReviewListItem {
  id: string;
  isOwner: boolean;
  reviewer: { id: string; name: string | null; avatarUrl: string | null };
  createdAt: string;
  generic: { ratings: Ratings; textReview: string | null; isPublic: boolean } | null;
  favouriteItems: { items: FavouriteItem[]; isPublic: boolean } | null;
}

export interface ReviewsResponse {
  reviews: ReviewListItem[];
  summary: { count: number; averageRating: number | null };
}

/** The signed-in user's own review for a restaurant (edit form source). */
export interface MyReview {
  id: string;
  restaurantId: string;
  ratings: Ratings;
  textReview: string | null;
  isPublicGeneric: boolean;
  isPublicItems: boolean;
  createdAt: string;
  updatedAt: string;
}

export const RATING_KEYS = ['food', 'service', 'price', 'ambiance'] as const;
export type RatingKey = (typeof RATING_KEYS)[number];

/** Where the browser goes to start Google login (full-page redirect). */
export const googleLoginUrl = `${API_URL}/auth/google`;
