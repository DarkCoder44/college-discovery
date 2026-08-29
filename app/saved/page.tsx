/**
 * Saved colleges — Server Component.
 *
 * Authorization happens on the server, before any HTML is produced: an
 * anonymous visitor is redirected to /login and never receives the page.
 *
 * The previous implementation rendered the page, fetched /api/saved from the
 * browser, and redirected on a 401. That flashed an empty shortlist to
 * signed-out users and made the protection look client-side. The API route
 * still enforces the same rule independently — this is defence in depth, not a
 * replacement for it.
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getSavedColleges } from "@/lib/services/saved.service";
import SavedCollegesClient from "@/components/saved/SavedCollegesClient";

export const metadata: Metadata = {
  title: "Saved colleges",
  description: "Your personal college shortlist.",
};

// Session-dependent: must never be statically cached or shared between users.
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fsaved");
  }

  // Scoped by the session user id — a user can only ever load their own rows.
  const saved = await getSavedColleges(user.id);

  return <SavedCollegesClient initialSaved={saved} userName={user.name} />;
}
