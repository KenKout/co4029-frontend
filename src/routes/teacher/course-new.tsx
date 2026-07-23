import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCourse } from "@/lib/api/hooks/teacher-courses";
import { useMe } from "@/lib/api/hooks/auth";

export default function CourseNewPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const createCourse = useCreateCourse();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    level: "beginner",
    estimated_minutes: "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  function slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: slugManuallyEdited ? f.slug : slugify(title),
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, slug }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;

    try {
      const course = await createCourse.mutateAsync({
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description || undefined,
        level: (form.level || undefined) as
          | "beginner"
          | "intermediate"
          | "advanced"
          | undefined,
        estimated_minutes: form.estimated_minutes
          ? parseInt(form.estimated_minutes)
          : undefined,
      });
      toast.success("Course created");
      navigate({
        to: "/teacher/courses/$courseId",
        params: { courseId: course.id },
      });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create course");
    }
  }

  return (
    <div className="max-w-xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link to="/teacher/courses">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-headline font-bold text-m3-on-surface">
          New Course
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            Title *
          </label>
          <Input
            required
            placeholder="e.g. Introduction to Algorithms"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            Slug *
          </label>
          <Input
            required
            placeholder="e.g. intro-to-algorithms"
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
          />
          <p className="text-[11px] text-m3-on-surface-variant">
            Used in the course URL. Must be unique.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            Description
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="What will students learn?"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-m3-on-surface">
              Level
            </label>
            <select
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.level}
              onChange={(e) =>
                setForm((f) => ({ ...f, level: e.target.value }))
              }
            >
              <option value="">None</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-m3-on-surface">
              Estimated minutes
            </label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 120"
              value={form.estimated_minutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimated_minutes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={createCourse.isPending || !form.title}
          >
            {createCourse.isPending ? "Creating…" : "Create Course"}
          </Button>
          <Link to="/teacher/courses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
