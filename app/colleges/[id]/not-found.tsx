import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

export default function CollegeNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <EmptyState
        icon="🏫"
        title="College not found"
        description="This college does not exist, or the link you followed is out of date."
        action={
          <>
            <Link href="/colleges" className="btn btn-primary">
              Browse all colleges
            </Link>
            <Link href="/" className="btn btn-ghost">
              Go home
            </Link>
          </>
        }
      />
    </div>
  );
}
