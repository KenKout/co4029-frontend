import { Link } from "@tanstack/react-router";
import { Loader2, LayoutDashboard, Settings, User, LogOut } from "lucide-react";
import type { TFunction } from "i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthUserInitials, type AuthUser } from "@/lib/auth";

const MENU_ITEM_CLASS =
  "rounded-lg px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:text-m3-primary";

export interface TopNavUserMenuProps {
  user: AuthUser | null;
  displayName: string;
  isLoggingOut: boolean;
  onLogoutClick: () => void;
  t: TFunction;
}

export function TopNavUserMenu({
  user,
  displayName,
  isLoggingOut,
  onLogoutClick,
  t,
}: TopNavUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary focus-visible:ring-offset-2 transition-all hover:opacity-90"
        aria-label="User menu"
      >
        <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
          {user?.profile?.avatar_url && (
            <AvatarImage src={user.profile.avatar_url} alt="" />
          )}
          <AvatarFallback className="bg-m3-primary text-white text-xs font-bold">
            {getAuthUserInitials(user)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-lg bg-card shadow-editorial border border-border p-1.5"
      >
        <div className="px-3 py-2.5">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {displayName}
          </p>
          <p className="text-xs text-m3-on-surface-variant truncate mt-0.5">
            {user?.primary_email}
          </p>
        </div>

        <DropdownMenuSeparator className="bg-m3-outline-variant/15" />

        <DropdownMenuGroup>
          <DropdownMenuItem className={MENU_ITEM_CLASS}>
            <Link to="/dashboard" className="flex items-center gap-3 w-full">
              <LayoutDashboard className="h-4 w-4 text-m3-on-surface-variant" />
              <span className="text-sm font-medium">{t("nav.dashboard")}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem className={MENU_ITEM_CLASS}>
            <Link to="/settings" className="flex items-center gap-3 w-full">
              <Settings className="h-4 w-4 text-m3-on-surface-variant" />
              <span className="text-sm font-medium">{t("nav.settings")}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem className={MENU_ITEM_CLASS}>
            <Link to="/profile" className="flex items-center gap-3 w-full">
              <User className="h-4 w-4 text-m3-on-surface-variant" />
              <span className="text-sm font-medium">{t("nav.profile")}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-m3-outline-variant/15" />

        <DropdownMenuItem
          variant="destructive"
          className="rounded-lg px-3 py-2 gap-3 cursor-pointer"
          disabled={isLoggingOut}
          onClick={onLogoutClick}
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{t("nav.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
