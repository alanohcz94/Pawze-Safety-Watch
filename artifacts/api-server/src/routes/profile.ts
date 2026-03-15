import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  hazardsTable,
  hazardConfirmationsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { deleteSession, getSessionId } from "../lib/auth";

const router: IRouter = Router();

function requireUser(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }

  return true;
}

function getUserId(req: Request): string | null {
  const user = req.user as { id?: string } | undefined;
  return typeof user?.id === "string" ? user.id : null;
}

router.get("/profile", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) {
    return;
  }

  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [reported] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hazardsTable)
    .where(eq(hazardsTable.reportedBy, userId));

  const [confirmed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hazardConfirmationsTable)
    .where(eq(hazardConfirmationsTable.userId, userId));

  res.json({
    stats: {
      hazardsReported: reported?.count ?? 0,
      hazardsConfirmed: confirmed?.count ?? 0,
      totalSteps: 0,
      weeklySteps: 0,
    },
  });
});

router.patch("/profile/image", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) {
    return;
  }

  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { profileImageUrl } = req.body as { profileImageUrl?: string | null };
  if (typeof profileImageUrl !== "string" || profileImageUrl.trim().length === 0) {
    res.status(400).json({ error: "Invalid request body: profileImageUrl required" });
    return;
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set({
      profileImageUrl: profileImageUrl.trim(),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updatedUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    profileImageUrl: updatedUser.profileImageUrl,
  });
});

router.delete("/profile", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) {
    return;
  }

  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const sid = getSessionId(req);

  await db.transaction(async (tx) => {
    const [reported] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(hazardsTable)
      .where(eq(hazardsTable.reportedBy, userId));

    if ((reported?.count ?? 0) > 0) {
      const anonymizedUserId = `deleted-${crypto.randomUUID()}`;

      await tx.insert(usersTable).values({
        id: anonymizedUserId,
        email: null,
        firstName: "Anonymous",
        lastName: "Pawzer",
        profileImageUrl: null,
      });

      await tx
        .update(hazardsTable)
        .set({ reportedBy: anonymizedUserId })
        .where(eq(hazardsTable.reportedBy, userId));
    }

    await tx
      .delete(hazardConfirmationsTable)
      .where(eq(hazardConfirmationsTable.userId, userId));

    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });

  if (sid) {
    await deleteSession(sid);
  }

  res.json({ success: true });
});

export default router;
