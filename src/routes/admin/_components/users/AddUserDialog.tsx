import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { AdminUsersController } from "./use-admin-users";

/** Inner form (fields + submit), kept small so the dialog stays lint-clean. */
function AddUserForm({
  c,
  onClose,
}: {
  c: AdminUsersController;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [orgId, setOrgId] = React.useState(c.orgOptions[0]?.id ?? "");
  const [roleCode, setRoleCode] = React.useState("student");
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 && orgId.length > 0 && !c.createUserPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await c.createUser({
        primary_email: email.trim(),
        display_name: displayName.trim() || undefined,
        organization_id: orgId,
        role_code: roleCode,
      });
      toast.success(
        t("admin.users.create_success", {
          defaultValue: "User created — they can now sign in with Google",
        }),
      );
      onClose();
    } catch (_err) {
      setError(
        t("admin.users.create_error", {
          defaultValue:
            "Could not create the user. The email may already be registered.",
        }),
      );
    }
  };

  const orgById = new Map(c.orgOptions.map((o) => [o.id, o.name]));

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <Field
        label={t("admin.users.create_email", { defaultValue: "Email" })}
        required
        renderControl={(p) => (
          <Input
            type="email"
            autoComplete="off"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...p}
          />
        )}
      />
      <Field
        label={t("admin.users.create_display_name", {
          defaultValue: "Display name",
        })}
        renderControl={(p) => (
          <Input
            type="text"
            autoComplete="off"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            {...p}
          />
        )}
      />
      <Field
        label={t("admin.users.create_organization", {
          defaultValue: "Organization",
        })}
        required
        renderControl={(p) => (
          <Select
            value={orgId}
            onValueChange={setOrgId}
            options={c.orgOptions.map((o) => ({
              value: o.id,
              label: o.name,
            }))}
            placeholder={t("admin.users.create_org_placeholder", {
              defaultValue: "Select an organization",
            })}
            {...p}
          />
        )}
      />
      <Field
        label={t("admin.users.create_role", { defaultValue: "Role" })}
        renderControl={(p) => (
          <Select
            value={roleCode}
            onValueChange={setRoleCode}
            options={c.roleOptions
              .filter((r) => r.code !== "admin")
              .map((r) => ({ value: r.code, label: r.name }))}
            {...p}
          />
        )}
      />
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-text-muted">
          {t("admin.users.create_hint", {
            defaultValue: "Organization: {{org}}",
            org: orgId ? (orgById.get(orgId) ?? orgId) : "—",
          })}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t("common.cancel", { defaultValue: "Cancel" })}
        </Button>
        <Button type="submit" size="sm" className="gap-1.5" disabled={!canSubmit}>
          {c.createUserPending ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {t("admin.users.create_submit", { defaultValue: "Create user" })}
        </Button>
      </div>
    </form>
  );
}

/**
 * Admin invite dialog: create a user (email + display name), attach them to
 * an org with a role — one step. Only rendered for `system.administer`
 * callers; the backend re-asserts the same gate on POST /users.
 */
export function AddUserDialog({
  c,
  open,
  onOpenChange,
}: {
  c: AdminUsersController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-m3-outline-variant/40 bg-white p-6 shadow-2xl",
            "outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <DialogPrimitive.Title className="font-headline text-lg font-bold text-text-strong">
            {t("admin.users.create_title", { defaultValue: "Add user" })}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-text-muted">
            {t("admin.users.create_subtitle", {
              defaultValue:
                "Create the account and attach it to an organization in one step. The invited email can sign in with Google immediately.",
            })}
          </DialogPrimitive.Description>

          <AddUserForm c={c} onClose={() => onOpenChange(false)} />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
