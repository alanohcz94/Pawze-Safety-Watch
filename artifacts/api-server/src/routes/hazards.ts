import { Router, type IRouter, type Request, type Response } from "express";
import { db, hazardsTable, hazardConfirmationsTable, usersTable } from "@workspace/db";
import type {
  CreateHazardRequest,
  ConfirmHazardRequest,
} from "@workspace/api-zod";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { calculateHazardExpiry } from "../lib/hazard";

const router: IRouter = Router();

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

function serializeHazard(
  hazard: {
    id: string;
    category: string;
    lat: number;
    lng: number;
    photoUrl: string | null;
    reportedBy: string;
    reportedByName?: string | null;
    reportedAt: Date;
    expiresAt: Date;
    confirmationCount: number;
  },
  userHasConfirmed = false,
) {
  return {
    id: hazard.id,
    category: hazard.category,
    lat: hazard.lat,
    lng: hazard.lng,
    photoUrl: hazard.photoUrl,
    reportedBy: hazard.reportedBy,
    reportedByName: hazard.reportedByName ?? null,
    reportedAt: hazard.reportedAt.toISOString(),
    expiresAt: hazard.expiresAt.toISOString(),
    confirmationCount: hazard.confirmationCount,
    userHasConfirmed,
  };
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

  const confirmedIds = new Set<string>();
  if (req.isAuthenticated() && filtered.length > 0) {
    const confirmations = await db
      .select({ hazardId: hazardConfirmationsTable.hazardId })
      .from(hazardConfirmationsTable)
      .where(
        and(
          eq(hazardConfirmationsTable.userId, req.user.id),
          inArray(
            hazardConfirmationsTable.hazardId,
            filtered.map((hazard) => hazard.id),
          ),
        ),
      );

    confirmations.forEach((confirmation) => {
      confirmedIds.add(confirmation.hazardId);
    });
  }

  res.json({
    hazards: filtered.map((hazard) =>
      serializeHazard(hazard, confirmedIds.has(hazard.id)),
    ),
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

  const reportedAt = new Date();
  const expiresAt = calculateHazardExpiry({
    category,
    reportedAt,
    photoUrl,
    confirmationCount: 0,
  });

  const [hazard] = await db
    .insert(hazardsTable)
    .values({
      category,
      lat,
      lng,
      photoUrl: photoUrl ?? null,
      reportedBy: req.user.id,
      reportedAt,
      expiresAt,
    })
    .returning();

  res.status(201).json({
    ...serializeHazard(
      {
        ...hazard,
        reportedByName: req.user.firstName,
      },
      false,
    ),
  });
});

router.post("/hazards/:id/confirm", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { lat, lng, photoUrl } = req.body as ConfirmHazardRequest;
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
    photoUrl: typeof photoUrl === "string" ? photoUrl : null,
  });

  const nextConfirmationCount = hazard.confirmationCount + 1;
  const nextExpiresAt = calculateHazardExpiry({
    category: hazard.category,
    reportedAt: hazard.reportedAt,
    photoUrl: hazard.photoUrl,
    confirmationCount: nextConfirmationCount,
  });

  const [updated] = await db
    .update(hazardsTable)
    .set({
      confirmationCount: sql`${hazardsTable.confirmationCount} + 1`,
      expiresAt: nextExpiresAt,
    })
    .where(eq(hazardsTable.id, hazardId))
    .returning();

  res.json({
    ...serializeHazard(updated, true),
  });
});

router.patch("/hazards/:id/photo", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { photoUrl } = req.body as { photoUrl?: string | null };
  if (typeof photoUrl !== "string" || photoUrl.trim().length === 0) {
    res.status(400).json({ error: "Invalid request body: photoUrl required" });
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

  const existing = await db
    .select({ id: hazardConfirmationsTable.id })
    .from(hazardConfirmationsTable)
    .where(
      and(
        eq(hazardConfirmationsTable.hazardId, hazardId),
        eq(hazardConfirmationsTable.userId, req.user.id),
      ),
    );

  if (existing.length === 0) {
    res.status(403).json({
      error: "Only users who confirmed this hazard can edit its photo",
    });
    return;
  }

  const [updated] = await db
    .update(hazardsTable)
    .set({
      photoUrl: photoUrl.trim(),
      expiresAt: calculateHazardExpiry({
        category: hazard.category,
        reportedAt: hazard.reportedAt,
        photoUrl,
        confirmationCount: hazard.confirmationCount,
      }),
    })
    .where(eq(hazardsTable.id, hazardId))
    .returning();

  res.json({
    ...serializeHazard(updated, true),
  });
});

export default router;
