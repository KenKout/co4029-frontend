import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import AvatarUploadRow from "./_components/profile/AvatarUploadRow";
import ProfileFormFields from "./_components/profile/ProfileFormFields";
import ProfileSaveRow from "./_components/profile/ProfileSaveRow";
import { useSettingsProfile } from "./_components/profile/use-settings-profile";

export default function SettingsProfilePage() {
  const { t } = useTranslation();
  const { me, errors, isSaving, handleSubmit, goBack, avatar } =
    useSettingsProfile();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader
        title={t("settings_profile.title")}
        subtitle={t("settings_profile.subtitle")}
        onBack={goBack}
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <AvatarUploadRow avatar={avatar} />
            <ProfileFormFields me={me} errors={errors} />
            <ProfileSaveRow isSaving={isSaving} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
