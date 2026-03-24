import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";
const IS_GUEST_KEY = "auth_is_guest";
const ISSUER_URL = process.env.EXPO_PUBLIC_ISSUER_URL ?? "https://replit.com/oidc";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,
  login: async () => {},
  loginAsGuest: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}`;
  }
  if (Platform.OS !== "web") {
    throw new Error(
      "EXPO_PUBLIC_DOMAIN is not configured. Set it in eas.json production env to your deployed Replit URL and rebuild the app.",
    );
  }
  return "";
}

function getClientId(): string {
  const id = process.env.EXPO_PUBLIC_REPL_ID;
  if (!id && Platform.OS !== "web") {
    console.warn("EXPO_PUBLIC_REPL_ID is not set — Replit Auth will fail. Add it to eas.json production env.");
  }
  return id || "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const discovery = AuthSession.useAutoDiscovery(ISSUER_URL);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: ["openid", "email", "profile", "offline_access"],
      redirectUri,
      prompt: AuthSession.Prompt.Login,
    },
    discovery,
  );

  const createGuestSession = useCallback(async (): Promise<string | null> => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/guest/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        console.error("Guest session failed:", res.status);
        return null;
      }

      const data = await res.json();
      if (!data.token) {
        return null;
      }

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(IS_GUEST_KEY, "true");
      return data.token;
    } catch (err) {
      console.error("Guest session error:", err);
      return null;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const loadUser = async (token: string) => {
        const res = await fetch(`${apiBase}/api/auth/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        return res.json();
      };

      let token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      let guestFlag = await SecureStore.getItemAsync(IS_GUEST_KEY);

      if (!token) {
        token = await createGuestSession();
        guestFlag = token ? "true" : null;
      }

      if (!token) {
        setUser(null);
        setIsGuest(false);
        return;
      }

      let data = await loadUser(token);

      if (!data.user) {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(IS_GUEST_KEY);
        token = await createGuestSession();
        guestFlag = token ? "true" : null;

        if (!token) {
          setUser(null);
          setIsGuest(false);
          return;
        }

        data = await loadUser(token);
      }

      if (data.user) {
        setUser(data.user);
        setIsGuest(guestFlag === "true");
      } else {
        setUser(null);
        setIsGuest(false);
      }
    } catch (err) {
      console.error("Fetch user error:", err);
      setUser(null);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  }, [createGuestSession]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (response?.type !== "success" || !request?.codeVerifier) return;

    const { code, state } = response.params;

    (async () => {
      try {
        const apiBase = getApiBaseUrl();
        if (!apiBase) {
          console.error("API base URL is not configured.");
          return;
        }

        const currentToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

        const exchangeRes = await fetch(`${apiBase}/api/mobile-auth/token-exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(currentToken
              ? { Authorization: `Bearer ${currentToken}` }
              : {}),
          },
          body: JSON.stringify({
            code,
            code_verifier: request.codeVerifier,
            redirect_uri: redirectUri,
            state,
          }),
        });

        if (!exchangeRes.ok) {
          console.error("Token exchange failed:", exchangeRes.status);
          setIsLoading(false);
          return;
        }

        const data = await exchangeRes.json();
        if (data.token) {
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
          await SecureStore.deleteItemAsync(IS_GUEST_KEY);
          setIsGuest(false);
          setIsLoading(true);
          await fetchUser();
        }
      } catch (err) {
        console.error("Token exchange error:", err);
        setIsLoading(false);
      }
    })();
  }, [response, request, redirectUri, fetchUser]);

  const login = useCallback(async () => {
    try {
      await promptAsync();
    } catch (err) {
      console.error("Login error:", err);
    }
  }, [promptAsync]);

  const loginAsGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(IS_GUEST_KEY);
      const token = await createGuestSession();
      if (!token) {
        setUser(null);
        setIsGuest(false);
        setIsLoading(false);
        return;
      }
      await fetchUser();
    } catch (err) {
      console.error("Guest login error:", err);
      setIsLoading(false);
    }
  }, [createGuestSession, fetchUser]);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
    } finally {
      setIsLoading(true);
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(IS_GUEST_KEY);
      setUser(null);
      setIsGuest(false);
      await fetchUser();
    }
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isGuest,
        login,
        loginAsGuest,
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
