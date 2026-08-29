import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free CollegeDiscover account to save and compare colleges.",
};

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
