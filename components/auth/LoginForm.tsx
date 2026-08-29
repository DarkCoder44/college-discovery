"use client";

/**
 * Login form.
 *
 * Client-side `required` attributes are a convenience only — the server
 * re-validates every field and is the sole authority. `noValidate` disables the
 * browser's own bubbles so all messages come from one place.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ApiError } from "@/lib/client/api";
import AuthCard from "@/components/auth/AuthCard";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Only accept a same-origin relative path as the post-login destination.
   * Echoing an arbitrary ?next= value into a redirect is an open-redirect
   * vulnerability — an attacker could send `?next=https://evil.example` and
   * bounce a freshly authenticated user off-site.
   */
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      router.push(nextPath);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not sign you in. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-indigo-600 font-medium hover:underline">
            Sign up free
          </Link>
        </>
      }
    >
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-6 text-xs text-indigo-800">
        <strong>Demo account:</strong> demo@example.com / Demo@123
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`input ${error ? "input-error" : ""}`}
            placeholder="you@example.com"
            aria-invalid={error !== null}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`input ${error ? "input-error" : ""}`}
            placeholder="Your password"
            aria-invalid={error !== null}
          />
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full btn-lg">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
