"use client";

/**
 * Auth Context
 * ------------
 * Holds the current user plus the set of college ids this user has saved, so
 * that every page shares one source of truth.
 *
 * Why this exists: previously the navbar fetched `/api/auth/me` and the college
 * list separately fetched `/api/saved`, each on mount, with no shared state.
 * Saving from the detail page left the list page's star icons stale, and the
 * navbar re-fetched the session on every route change.
 *
 * IMPORTANT: this is UI state only. It decides what to *render*. Every
 * privileged operation is re-authorized on the server from the session cookie —
 * nothing here is trusted for access control.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, del, postJson, ApiError } from "@/lib/client/api";
import { useToast } from "@/components/providers/ToastProvider";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial session probe resolves — drives skeletons. */
  isLoading: boolean;
  isAuthenticated: boolean;
  savedCollegeIds: Set<string>;
  isSaved: (collegeId: string) => boolean;
  /** Adds or removes a saved college; returns true when the state changed. */
  toggleSaved: (collegeId: string, collegeName?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedCollegeIds, setSavedCollegeIds] = useState<Set<string>>(new Set());

  /**
   * College ids with a save/unsave request currently in flight.
   *
   * Without this, double-clicking the star fires two requests from the same
   * stale closure: both read `wasSaved === false`, both POST, the second gets
   * a 409, and its rollback clears the id — leaving the star showing "unsaved"
   * while the college is in fact saved. A ref (not state) because it must be
   * read and written synchronously within one event, before any re-render.
   */
  const inFlightRef = useRef<Set<string>>(new Set());

  const loadSavedColleges = useCallback(async () => {
    try {
      const { saved } = await apiFetch<{ saved: Array<{ college: { id: string } }> }>(
        "/api/saved-colleges"
      );
      setSavedCollegeIds(new Set(saved.map((s) => s.college.id)));
    } catch {
      // A 401 here just means "anonymous" — not an error worth showing.
      setSavedCollegeIds(new Set());
    }
  }, []);

  // Probe the session once on mount. Subsequent changes flow through
  // signIn/signOut, so route changes no longer trigger a re-fetch.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { user: me } = await apiFetch<{ user: AuthUser }>("/api/auth/me");
        if (cancelled) return;
        setUser(me);
        await loadSavedColleges();
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadSavedColleges]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user: signedIn } = await postJson<{ user: AuthUser }>(
        "/api/auth/login",
        { email, password }
      );
      setUser(signedIn);
      await loadSavedColleges();
      showToast(`Welcome back, ${signedIn.name.split(" ")[0]}`, "success");
      router.refresh();
    },
    [loadSavedColleges, router, showToast]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { user: created } = await postJson<{ user: AuthUser }>(
        "/api/auth/signup",
        { name, email, password }
      );
      setUser(created);
      setSavedCollegeIds(new Set());
      showToast("Account created. You're signed in.", "success");
      router.refresh();
    },
    [router, showToast]
  );

  const signOut = useCallback(async () => {
    try {
      await postJson("/api/auth/logout", {});
    } finally {
      // Clear local state even if the request failed — the cookie may already
      // be gone, and leaving a stale "signed in" UI would be worse.
      setUser(null);
      setSavedCollegeIds(new Set());
      showToast("Signed out", "info");
      router.push("/");
      router.refresh();
    }
  }, [router, showToast]);

  const toggleSaved = useCallback(
    async (collegeId: string, collegeName?: string) => {
      if (!user) {
        showToast("Sign in to save colleges", "info");
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return false;
      }

      // Ignore a repeat click while the previous one is still resolving.
      if (inFlightRef.current.has(collegeId)) return false;
      inFlightRef.current.add(collegeId);

      const wasSaved = savedCollegeIds.has(collegeId);
      const label = collegeName ? `"${collegeName}"` : "College";

      // Optimistic update — the star flips immediately, and is rolled back
      // below if the server rejects the change.
      setSavedCollegeIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.delete(collegeId);
        else next.add(collegeId);
        return next;
      });

      try {
        if (wasSaved) {
          await del(`/api/saved-colleges/${collegeId}`);
          showToast(`${label} removed from your shortlist`, "success");
        } else {
          await postJson("/api/saved-colleges", { collegeId });
          showToast(`${label} saved to your shortlist`, "success");
        }
        return true;
      } catch (error) {
        setSavedCollegeIds((current) => {
          const next = new Set(current);
          if (wasSaved) next.add(collegeId);
          else next.delete(collegeId);
          return next;
        });

        if (error instanceof ApiError) {
          if (error.isUnauthenticated) {
            setUser(null);
            showToast("Your session expired. Please sign in again.", "error");
            router.push("/login");
          } else {
            showToast(error.message, "error");
          }
        } else {
          showToast("Could not update your shortlist. Please try again.", "error");
        }
        return false;
      } finally {
        inFlightRef.current.delete(collegeId);
      }
    },
    [user, savedCollegeIds, router, showToast]
  );

  const isSaved = useCallback(
    (collegeId: string) => savedCollegeIds.has(collegeId),
    [savedCollegeIds]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      savedCollegeIds,
      isSaved,
      toggleSaved,
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading, savedCollegeIds, isSaved, toggleSaved, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
