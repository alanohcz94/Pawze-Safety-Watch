import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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

export interface VetClinic {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  lat: number;
  lng: number;
  distance: number;
  emergency: boolean;
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

export async function uploadPhoto(uri: string): Promise<string> {
  const base = getApiBaseUrl();
  const formData = new FormData();

  const filename = uri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1] === "jpg" ? "jpeg" : match[1]}` : "image/jpeg";

  const photoBlob: Record<string, string> = {
    uri,
    name: filename,
    type,
  };
  formData.append("photo", photoBlob as unknown as Blob);

  const res = await fetch(`${base}/api/upload`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Failed to upload photo");
  }

  const data = await res.json();
  return data.photoUrl;
}

export async function fetchNearbyVets(lat: number, lng: number, radius?: number): Promise<VetClinic[]> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set("radius", String(radius));
  const res = await fetch(`${base}/api/vets/nearby?${params}`, {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch nearby vets");
  const data = await res.json();
  return data.vets;
}
