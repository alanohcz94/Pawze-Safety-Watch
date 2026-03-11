import { Router, type IRouter, type Request, type Response } from "express";
import { db, hazardsTable, hazardConfirmationsTable, usersTable } from "@workspace/db";
import type {
  ListHazardsParams,
  CreateHazardRequest,
  ConfirmHazardRequest,
  GetHazardSummaryParams,
} from "@workspace/api-zod";
import { eq, and, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

const HAZARD_EXPIRY_DAYS = 10;
const MAX_CONFIRM_DISTANCE_M = 10;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseLatLng(query: any): { lat: number; lng: number; radius?: number } | null {
  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);
  if (isNaN(lat) || isNaN(lng)) return null;
  const radius = query.radius ? parseFloat(query.radius) : undefined;
  return { lat, lng, radius: radius && !isNaN(radius) ? radius : undefined };
}

router.get("/hazards/summary", async (req: Request, res: Response) => {
  const params = parseLatLng(req.query);
  if (!params) {
    res.status(400).json({ error: "Invalid parameters: lat and lng required" });
    return;
  }

  const { lat, lng, radius } = params;
  const radiusM = radius ?? 5000;
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const allHazards = await db
    .select()
    .from(hazardsTable)
    .where(gte(hazardsTable.expiresAt, now));

  const nearby = allHazards.filter(
    (h) => haversineDistance(lat, lng, h.lat, h.lng) <= radiusM,
  );

  const hazardsToday = nearby.filter((h) => h.reportedAt >= todayStart).length;

  const breakdown: Record<string, number> = {};
  for (const h of nearby) {
    breakdown[h.category] = (breakdown[h.category] || 0) + 1;
  }

  res.json({
    hazardsToday,
    activeHazards: nearby.length,
    breakdown,
  });
});

router.get("/hazards", async (req: Request, res: Response) => {
  const params = parseLatLng(req.query);
  if (!params) {
    res.status(400).json({ error: "Invalid parameters: lat and lng required" });
    return;
  }

  const { lat, lng, radius } = params;
  const radiusM = radius ?? 5000;
  const now = new Date();

  const allHazards = await db
    .select({
      id: hazardsTable.id,
      category: hazardsTable.category,
      lat: hazardsTable.lat,
      lng: hazardsTable.lng,
      photoUrl: hazardsTable.photoUrl,
      reportedBy: hazardsTable.reportedBy,
      reportedAt: hazardsTable.reportedAt,
      expiresAt: hazardsTable.expiresAt,
      confirmationCount: hazardsTable.confirmationCount,
      reportedByName: usersTable.firstName,
    })
    .from(hazardsTable)
    .leftJoin(usersTable, eq(hazardsTable.reportedBy, usersTable.id))
    .where(gte(hazardsTable.expiresAt, now));

  const filtered = allHazards.filter(
    (h) => haversineDistance(lat, lng, h.lat, h.lng) <= radiusM,
  );

  res.json({
    hazards: filtered.map((h) => ({
      ...h,
      reportedAt: h.reportedAt.toISOString(),
      expiresAt: h.expiresAt.toISOString(),
    })),
  });
});

router.post("/hazards", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { category, lat, lng, photoUrl } = req.body as CreateHazardRequest;
  if (!category || typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "Invalid request body: category, lat, lng required" });
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + HAZARD_EXPIRY_DAYS);

  const [hazard] = await db
    .insert(hazardsTable)
    .values({
      category,
      lat,
      lng,
      photoUrl: photoUrl ?? null,
      reportedBy: req.user.id,
      expiresAt,
    })
    .returning();

  res.status(201).json({
    id: hazard.id,
    category: hazard.category,
    lat: hazard.lat,
    lng: hazard.lng,
    photoUrl: hazard.photoUrl,
    reportedBy: hazard.reportedBy,
    reportedByName: req.user.firstName,
    reportedAt: hazard.reportedAt.toISOString(),
    expiresAt: hazard.expiresAt.toISOString(),
    confirmationCount: hazard.confirmationCount,
  });
});

router.post("/hazards/:id/confirm", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { lat, lng } = req.body as ConfirmHazardRequest;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "Invalid request body: lat and lng required" });
    return;
  }

  const hazardId = req.params.id;

  const [hazard] = await db
    .select()
    .from(hazardsTable)
    .where(eq(hazardsTable.id, hazardId));

  if (!hazard) {
    res.status(404).json({ error: "Hazard not found" });
    return;
  }

  if (hazard.expiresAt < new Date()) {
    res.status(400).json({ error: "Hazard has expired" });
    return;
  }

  const distance = haversineDistance(lat, lng, hazard.lat, hazard.lng);
  if (distance > MAX_CONFIRM_DISTANCE_M) {
    res.status(400).json({ error: `Must be within ${MAX_CONFIRM_DISTANCE_M}m of hazard (currently ${Math.round(distance)}m away)` });
    return;
  }

  const existing = await db
    .select()
    .from(hazardConfirmationsTable)
    .where(
      and(
        eq(hazardConfirmationsTable.hazardId, hazardId),
        eq(hazardConfirmationsTable.userId, req.user.id),
      ),
    );

  if (existing.length > 0) {
    res.status(400).json({ error: "You have already confirmed this hazard" });
    return;
  }

  await db.insert(hazardConfirmationsTable).values({
    hazardId,
    userId: req.user.id,
  });

  const [updated] = await db
    .update(hazardsTable)
    .set({ confirmationCount: sql`${hazardsTable.confirmationCount} + 1` })
    .where(eq(hazardsTable.id, hazardId))
    .returning();

  res.json({
    id: updated.id,
    category: updated.category,
    lat: updated.lat,
    lng: updated.lng,
    photoUrl: updated.photoUrl,
    reportedBy: updated.reportedBy,
    reportedByName: null,
    reportedAt: updated.reportedAt.toISOString(),
    expiresAt: updated.expiresAt.toISOString(),
    confirmationCount: updated.confirmationCount,
  });
});

export default router;
