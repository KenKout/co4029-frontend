import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when the course has modules but no publishable lesson content yet. */
export function NoLessonsNotice({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-m3-on-surface font-headline font-bold text-xl">
          No lessons available yet
        </p>
        <p className="text-sm text-m3-on-surface-variant">
          This course does not have any lesson content ready for students yet.
        </p>
        <Link to="/courses/$slug" params={{ slug }}>
          <Button className="gradient-primary text-white rounded-xl gap-2">
            Back to Course <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
