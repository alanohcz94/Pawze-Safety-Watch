import * as SecureStore from "expo-secure-store";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync("auth_session_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export interface HazardItem {
  id: string;
  category: string;
  lat: number;
  lng: number;
  photoUrl: string | null;
  reportedBy: string;
  reportedByName: string | null;
  reportedAt: string;
  expiresAt: string;
  confirmationCount: number;
}

export interface HazardSummary {
  hazardsToday: number;
  activeHazards: number;
  breakdown: Record<string, number>;
}

export async function fetchHazards(lat: number, lng: number, radius?: number): Promise<HazardItem[]> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set("radius", String(radius));
  const res = await fetch(`${base}/api/hazards?${params}`, {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch hazards");
  const data = await res.json();
  return data.hazards;
}

export async function createHazard(body: {
  category: string;
  lat: number;
  lng: number;
  photoUrl?: string | null;
}): Promise<HazardItem> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/hazards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to create hazard");
  }
  return res.json();
}

export async function confirmHazard(id: string, lat: number, lng: number): Promise<HazardItem> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/hazards/${id}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to confirm hazard");
  }
  return res.json();
}

export async function fetchHazardSummary(lat: number, lng: number, radius?: number): Promise<HazardSummary> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set("radius", String(radius));
  const res = await fetch(`${base}/api/hazards/summary?${params}`, {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}
