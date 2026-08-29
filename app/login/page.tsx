import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your CollegeDiscover account.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in? Skip the form entirely.
  const user = await getCurrentUser();
  if (user) redirect("/");

  // LoginForm reads ?next= via useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
