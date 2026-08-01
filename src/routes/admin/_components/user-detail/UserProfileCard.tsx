import type { AdminUserRecord, TFn } from "./types";

type UserProfile = NonNullable<AdminUserRecord["profile"]>;

export function UserProfileCard({
  t,
  profile,
}: {
  t: TFn;
  profile: UserProfile;
}) {
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
        {t("admin.users.profile_section", { defaultValue: "Profile" })}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-text-muted">
            {t("admin.users.fields.display_name")}
          </dt>
          <dd className="text-text-strong mt-0.5">
            {profile.display_name || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-text-muted">
            {t("admin.users.fields.full_name")}
          </dt>
          <dd className="text-text-strong mt-0.5">
            {[profile.given_name, profile.family_name]
              .filter(Boolean)
              .join(" ") || "—"}
          </dd>
        </div>
        {profile.bio ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-text-muted">
              {t("admin.users.fields.bio")}
            </dt>
            <dd className="text-text-strong mt-0.5 whitespace-pre-wrap">
              {profile.bio}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
