"use client";

/**
 * Signup form.
 *
 * Per-field errors come straight from the server's Zod `fieldErrors` map, so
 * the messages the user sees are exactly the rules the server enforces — they
 * cannot drift apart.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ApiError } from "@/lib/client/api";
import AuthCard from "@/components/auth/AuthCard";

type FieldErrors = Record<string, string[] | undefined>;

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same open-redirect guard as the login form.
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await signUp(name, email, password);
      router.push(nextPath);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setFieldErrors(err.details);
      } else if (err instanceof ApiError) {
        // e.g. 409 "An account with this email already exists"
        setFormError(err.message);
      } else {
        setFormError("Could not create your account. Please try again.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Save colleges and build your shortlist"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`input ${fieldErrors.name ? "input-error" : ""}`}
            placeholder="Your name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && (
            <p id="name-error" role="alert" className="error-msg">
              {fieldErrors.name[0]}
            </p>
          )}
        </div>

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
            className={`input ${fieldErrors.email ? "input-error" : ""}`}
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="error-msg">
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`input ${fieldErrors.password ? "input-error" : ""}`}
            placeholder="At least 8 characters"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
          />
          {fieldErrors.password ? (
            <p id="password-error" role="alert" className="error-msg">
              {fieldErrors.password[0]}
            </p>
          ) : (
            <p id="password-hint" className="text-xs text-slate-400 mt-1">
              At least 8 characters, with one uppercase letter, one lowercase
              letter and one number.
            </p>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg"
          >
            {formError}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full btn-lg">
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
