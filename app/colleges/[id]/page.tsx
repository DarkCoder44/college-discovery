/**
 * College detail — Server Component.
 *
 * Rendered on the server with data already in place, so there is no client-side
 * loading spinner for the main content and the page is fully indexable.
 * `[id]` accepts a cuid or the SEO slug.
 *
 * Deliberately NO `loading.tsx` in this segment.
 *
 * A `loading.tsx` would wrap the page in a Suspense boundary, which makes
 * Next.js start streaming the response — committing HTTP 200 — before the
 * college lookup has run. `notFound()` would then still render the correct UI,
 * but the response would carry a 200 instead of a 404: a "soft 404" that
 * search engines index and uptime monitoring cannot detect.
 *
 * The lookup is one indexed query against a small table, so the skeleton would
 * be visible for only a few milliseconds. Returning an honest status code is
 * worth more than that. See node_modules/next/dist/docs → not-found.md,
 * "Calling notFound() after streaming has started".
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollegeByIdOrSlug } from "@/lib/services/college.service";
import { collegeIdentifierSchema } from "@/lib/validation/schemas";
import CollegeDetailClient from "@/components/colleges/CollegeDetailClient";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const parsed = collegeIdentifierSchema.safeParse(id);
  if (!parsed.success) return { title: "College not found" };

  const college = await getCollegeByIdOrSlug(parsed.data);
  if (!college) return { title: "College not found" };

  return {
    title: `${college.name} — fees, courses, placements and reviews`,
    description: college.description.slice(0, 155),
    alternates: { canonical: `/colleges/${college.slug}` },
  };
}

export default async function CollegeDetailPage({ params }: PageProps) {
  const { id } = await params;

  // A malformed identifier is a 404, not a 500 — reject it before querying.
  const parsed = collegeIdentifierSchema.safeParse(id);
  if (!parsed.success) notFound();

  const college = await getCollegeByIdOrSlug(parsed.data);
  if (!college) notFound();

  return <CollegeDetailClient college={college} />;
}
