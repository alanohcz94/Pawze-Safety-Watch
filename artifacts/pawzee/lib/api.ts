import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  console.log("domain ", domain)
  if (domain) {
    return `https://${domain}`;
  }
  if (Platform.OS !== "web") {
    throw new Error(
      "EXPO_PUBLIC_DOMAIN is not configured. Set it in eas.json production env to your deployed Replit URL (e.g. myproject.replit.app) and rebuild the app.",
    );
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
  userHasConfirmed: boolean;
}

export interface HazardSummary {
  hazardsToday: number;
  activeHazards: number;
  breakdown: Record<string, number>;
}

export interface ProfileStats {
  hazardsReported: number;
  hazardsConfirmed: number;
  totalSteps: number;
  weeklySteps: number;
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

async function safeFetch(
  input: string,
  init?: RequestInit,
  userMessage = "Network error. Please check your connection and try again.",
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(userMessage);
  }
}

function normalizeHazardItem(hazard: Omit<HazardItem, "userHasConfirmed"> & {
  userHasConfirmed?: boolean;
}): HazardItem {
  return {
    userHasConfirmed: false,
    ...hazard,
  };
}

export async function fetchHazards(lat: number, lng: number, radius?: number): Promise<HazardItem[]> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set("radius", String(radius));
  const res = await safeFetch(
    `${base}/api/hazards?${params}`,
    { headers: await getAuthHeaders() },
    "Unable to load hazards. Please check your connection.",
  );
  if (!res.ok) throw new Error("Failed to fetch hazards");
  const data = await res.json();
  return data.hazards.map(normalizeHazardItem);
}

export async function createHazard(body: {
  category: string;
  lat: number;
  lng: number;
  photoUrl?: string | null;
}): Promise<HazardItem> {
  const base = getApiBaseUrl();
  const res = await safeFetch(
    `${base}/api/hazards`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify(body),
    },
    "Unable to report hazard. Please check your connection.",
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to create hazard");
  }
  const data = await res.json();
  return normalizeHazardItem(data);
}

export async function confirmHazard(id: string, lat: number, lng: number): Promise<HazardItem> {
  const base = getApiBaseUrl();
  const res = await safeFetch(
    `${base}/api/hazards/${id}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ lat, lng }),
    },
    "Unable to confirm hazard. Please check your connection.",
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to confirm hazard");
  }
  const data = await res.json();
  return normalizeHazardItem(data);
}

export async function updateHazardPhoto(id: string, photoUrl: string): Promise<HazardItem> {
  const base = getApiBaseUrl();
  const res = await safeFetch(
    `${base}/api/hazards/${id}/photo`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ photoUrl }),
    },
    "Unable to update photo. Please check your connection.",
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to update hazard photo");
  }
  const data = await res.json();
  return normalizeHazardItem(data);
}

export async function fetchHazardSummary(lat: number, lng: number, radius?: number): Promise<HazardSummary> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set("radius", String(radius));
  const res = await safeFetch(
    `${base}/api/hazards/summary?${params}`,
    { headers: await getAuthHeaders() },
    "Unable to load hazard summary. Please check your connection.",
  );
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

  const res = await safeFetch(
    `${base}/api/upload`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
      body: formData,
    },
    "Unable to upload photo. Please check your connection.",
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Failed to upload photo");
  }

  const data = await res.json();
  return data.photoUrl;
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const base = getApiBaseUrl();
  const res = await safeFetch(
    `${base}/api/profile`,
    { headers: await getAuthHeaders() },
    "Unable to load profile. Please check your connection.",
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to fetch profile");
  }

  const data = await res.json();
  return data.stats;
}

export async function updateProfileImage(profileImageUrl: string): Promise<string> {
  const base = getApiBaseUrl();
  const res = await safeFetch(
    `${base}/api/profile/image`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ profileImageUrl }),
    },
    "Unable to update profile image. Please check your connection.",
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to update profile image");
  }

  const data = await res.json();
  return data.profileImageUrl;
}

export async function deleteProfileAccount(): Promise<void> {
  const base = getApiBaseUrl();
  const res = await safeFetch(
    `${base}/api/profile`,
    {
      method: "DELETE",
      headers: await getAuthHeaders(),
    },
    "Unable to delete account. Please check your connection.",
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to delete account");
  }
}

export async function fetchNearbyVets(lat: number, lng: number, radius?: number): Promise<VetClinic[]> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set("radius", String(radius));
  const res = await safeFetch(
    `${base}/api/vets/nearby?${params}`,
    { headers: await getAuthHeaders() },
    "Unable to load nearby vets. Please check your connection.",
  );
  if (!res.ok) throw new Error("Failed to fetch nearby vets");
  const data = await res.json();
  return data.vets;
}
