import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";
const IS_GUEST_KEY = "auth_is_guest";

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
  authError: string | null;
  login: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,
  authError: null,
  login: async () => {},
  loginAsGuest: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  clearAuthError: () => {},
});

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

async function authFetch(
  input: string,
  init?: RequestInit,
  userMessage = "Network error. Please check your connection.",
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(userMessage);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const createGuestSession = useCallback(async (): Promise<string | null> => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await authFetch(
        `${apiBase}/api/guest/session`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
        "Unable to start a session. Please check your connection.",
      );

      if (!res.ok) {
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
      const msg =
        err instanceof Error ? err.message : "Failed to start a session.";
      setAuthError(msg);
      return null;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();

      const loadUser = async (token: string) => {
        try {
          const res = await authFetch(
            `${apiBase}/api/auth/user`,
            { headers: { Authorization: `Bearer ${token}` } },
            "Unable to load your account. Please check your connection.",
          );
          if (!res.ok) {
            return { user: null };
          }
          return res.json();
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to load account.";
          setAuthError(msg);
          return { user: null };
        }
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
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong loading your account.";
      setAuthError(msg);
      setUser(null);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  }, [createGuestSession]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async () => {
    try {
      clearAuthError();
      const apiBase = getApiBaseUrl();

      if (Platform.OS === "web") {
        window.location.href = `${apiBase}/api/login`;
        return;
      }

      const currentToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

      const startUrl = currentToken
        ? `${apiBase}/api/mobile-auth/start?guest_token=${encodeURIComponent(currentToken)}`
        : `${apiBase}/api/mobile-auth/start`;

      const result = await WebBrowser.openAuthSessionAsync(
        startUrl,
        "pawzee://",
      );

      if (result.type !== "success") {
        return;
      }

      const returnedUrl = new URL(result.url);
      const token = returnedUrl.searchParams.get("token");
      const error = returnedUrl.searchParams.get("error");

      if (error || !token) {
        setAuthError("Sign-in failed. Please try again.");
        return;
      }

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      await SecureStore.deleteItemAsync(IS_GUEST_KEY);
      setIsGuest(false);
      await fetchUser();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.";
      setAuthError(msg);
    }
  }, [clearAuthError, fetchUser]);

  const loginAsGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      clearAuthError();
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(IS_GUEST_KEY);
      const token = await createGuestSession();
      if (!token) {
        setAuthError(
          "Unable to create a guest session. Please check your connection and try again.",
        );
        setUser(null);
        setIsGuest(false);
        setIsLoading(false);
        return;
      }
      await fetchUser();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to continue as guest.";
      setAuthError(msg);
      setIsLoading(false);
    }
  }, [createGuestSession, fetchUser, clearAuthError]);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await authFetch(`${apiBase}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
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
        authError,
        login,
        loginAsGuest,
        logout,
        refreshUser: fetchUser,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
