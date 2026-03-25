import crypto from "node:crypto";
import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import type {
  AuthUserEnvelope,
  MobileTokenExchangeRequest,
  MobileTokenExchangeSuccess,
  LogoutSuccess,
  AuthUser,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  hazardsTable,
  hazardConfirmationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  invalidateOidcConfig,
  getSessionId,
  getSession,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const MOBILE_STATE_TTL = 10 * 60 * 1000;

interface MobileAuthState {
  codeVerifier: string;
  nonce: string;
  guestToken: string | null;
  expiresAt: number;
}
const mobileAuthStates = new Map<string, MobileAuthState>();
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of mobileAuthStates) {
    if (val.expiresAt < now) mobileAuthStates.delete(key);
  }
}, 60_000).unref();

const router: IRouter = Router();

function toAuthUser(user: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
  };
}

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userId = claims.sub as string;
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const userData = {
    id: userId,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    // Keep a user-uploaded profile image instead of overwriting it with the
    // provider image on every login.
    profileImageUrl:
      existingUser?.profileImageUrl ||
      ((claims.profile_image_url || claims.picture) as string | null),
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

async function transferGuestData(guestUserId: string, userId: string) {
  if (!guestUserId.startsWith("guest-") || guestUserId === userId) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(hazardsTable)
      .set({ reportedBy: userId })
      .where(eq(hazardsTable.reportedBy, guestUserId));

    await tx
      .update(hazardConfirmationsTable)
      .set({ userId })
      .where(eq(hazardConfirmationsTable.userId, guestUserId));
  });
}

router.get("/auth/user", async (req: Request, res: Response) => {
  let user: AuthUser | null = null;
  const currentUser = req.user as { id?: string } | undefined;

  if (req.isAuthenticated() && currentUser?.id) {
    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUser.id));

    user = dbUser ? toAuthUser(dbUser) : null;
  }

  const response: AuthUserEnvelope = { user };
  res.json(response);
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: toAuthUser(dbUser),
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.get("/mobile-auth/start", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/mobile-auth/callback`;

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const guestToken = typeof req.query.guest_token === "string" && req.query.guest_token
      ? req.query.guest_token
      : null;

    mobileAuthStates.set(state, {
      codeVerifier,
      nonce,
      guestToken,
      expiresAt: Date.now() + MOBILE_STATE_TTL,
    });

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login consent",
      state,
      nonce,
    });

    res.redirect(redirectTo.href);
  } catch (err) {
    console.error("mobile-auth/start error:", err);
    res.redirect("pawzee://auth-callback?error=server_error");
  }
});

router.get("/mobile-auth/callback", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/mobile-auth/callback`;

    const queryState = typeof req.query.state === "string" ? req.query.state : null;
    if (!queryState) {
      res.redirect("pawzee://auth-callback?error=missing_state");
      return;
    }

    const authState = mobileAuthStates.get(queryState);
    if (!authState || authState.expiresAt < Date.now()) {
      mobileAuthStates.delete(queryState);
      res.redirect("pawzee://auth-callback?error=expired_state");
      return;
    }
    mobileAuthStates.delete(queryState);

    const currentUrl = new URL(
      `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
    );

    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: authState.codeVerifier,
      expectedNonce: authState.nonce,
      expectedState: queryState,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.redirect("pawzee://auth-callback?error=no_claims");
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

    if (authState.guestToken) {
      const guestSession = await getSession(authState.guestToken);
      if (guestSession?.user?.id) {
        await transferGuestData(guestSession.user.id, dbUser.id);
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: toAuthUser(dbUser),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    res.redirect(`pawzee://auth-callback?token=${encodeURIComponent(sid)}`);
  } catch (err) {
    console.error("mobile-auth/callback error:", err);
    res.redirect("pawzee://auth-callback?error=auth_failed");
  }
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const { code, code_verifier, redirect_uri, state, nonce } = req.body as MobileTokenExchangeRequest;

    if (!code || !code_verifier || !redirect_uri || !state) {
      res.status(400).json({ error: "Missing required parameters: code, code_verifier, redirect_uri, state" });
      return;
    }

    const attemptTokenExchange = async (retrying = false): Promise<void> => {
      const config = await getOidcConfig();

      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("iss", ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const currentUser = req.user as { id?: string } | undefined;
      if (currentUser?.id) {
        await transferGuestData(currentUser.id, dbUser.id);
      }

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: toAuthUser(dbUser),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      const response: MobileTokenExchangeSuccess = { token: sid };
      res.json(response);
    };

    try {
      await attemptTokenExchange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isKeyError =
        msg.includes("no matching key") ||
        msg.includes("signature verification") ||
        msg.includes("JWKSNoMatchingKey") ||
        msg.includes("JWTClaimValidationFailed");

      if (isKeyError && !res.headersSent) {
        console.warn("OIDC key validation failed — re-fetching discovery and retrying once");
        invalidateOidcConfig();
        try {
          await attemptTokenExchange(true);
          return;
        } catch (retryErr) {
          console.error("Mobile token exchange retry failed:", retryErr);
          res.status(401).json({ error: "Authentication failed. Please sign in again." });
          return;
        }
      }

      if (!res.headersSent) {
        console.error("Mobile token exchange error:", err);
        res.status(500).json({ error: "Token exchange failed" });
      }
    }
  },
);

router.post("/guest/session", async (req: Request, res: Response) => {
  try {
    const guestId = `guest-${crypto.randomUUID()}`;

    const [guestUser] = await db
      .insert(usersTable)
      .values({
        id: guestId,
        email: null,
        firstName: "Guest",
        lastName: null,
        profileImageUrl: null,
      })
      .returning();

    const sessionData: SessionData = {
      user: toAuthUser(guestUser),
      access_token: "guest",
    };

    const sid = await createSession(sessionData);
    res.json({ token: sid });
  } catch (err) {
    console.error("Guest session error:", err);
    res.status(500).json({ error: "Failed to create guest session" });
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json({ success: true } satisfies LogoutSuccess);
});

export default router;
