import type {
  Decision,
  Section1,
  Section2,
  TastingRequest,
  WhoAmI,
} from '../../../shared/schema';

/**
 * Demo persona handling.
 *
 * When deployed, the Databricks platform proxy supplies the real signed-in
 * identity (x-forwarded-email) and this header is ignored by the server. In the
 * builder preview there is no proxy identity, so the in-app persona switcher
 * lets you act as the end user (requester) or as the approver (Claudia) to
 * exercise the full workflow. The chosen email is sent as x-demo-user.
 */
const DEMO_USER_KEY = 'tasting.demoUser';

export interface Persona {
  label: string;
  email: string;
}

export const DEMO_PERSONAS: Persona[] = [
  { label: 'End user (Requester)', email: 'requester@danone.com' },
  { label: 'Claudia (Approver)', email: 'claudia@danone.com' },
];

let currentDemoUser: string =
  (typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_USER_KEY)) ||
  DEMO_PERSONAS[0].email;

export function getDemoUser(): string {
  return currentDemoUser;
}

export function setDemoUser(email: string): void {
  currentDemoUser = email;
  try {
    localStorage.setItem(DEMO_USER_KEY, email);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('x-demo-user', currentDemoUser);
  if (options.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as Record<string, unknown>).error === 'string'
    ) {
      message = (data as Record<string, string>).error;
    }
    throw new Error(message);
  }
  return data as T;
}

export function fetchWhoAmI(): Promise<WhoAmI> {
  return apiFetch<WhoAmI>('/api/whoami');
}

export function createRequest(section1: Section1): Promise<TastingRequest> {
  return apiFetch<TastingRequest>('/api/requests', {
    method: 'POST',
    body: JSON.stringify(section1),
  });
}

export function listMyRequests(): Promise<TastingRequest[]> {
  return apiFetch<TastingRequest[]>('/api/requests/mine');
}

export function listPendingRequests(): Promise<TastingRequest[]> {
  return apiFetch<TastingRequest[]>('/api/requests/pending');
}

export function getRequest(id: string): Promise<TastingRequest> {
  return apiFetch<TastingRequest>(`/api/requests/${id}`);
}

export function decideRequest(
  id: string,
  decision: Decision,
): Promise<TastingRequest> {
  return apiFetch<TastingRequest>(`/api/requests/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify(decision),
  });
}

export function submitSection2(
  id: string,
  section2: Section2,
): Promise<TastingRequest> {
  return apiFetch<TastingRequest>(`/api/requests/${id}/section2`, {
    method: 'POST',
    body: JSON.stringify(section2),
  });
}
