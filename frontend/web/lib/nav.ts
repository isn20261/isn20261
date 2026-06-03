/**
 * Shared primary-navigation model (issue #92 / #216).
 *
 * NAV_ITEMS + isActive are consumed by BOTH the desktop rail (Sidebar) and the
 * mobile tab bar (MobileTabBar). Kept here so the two surfaces can't drift.
 */

import { Home, Clock, Sparkles, Bookmark, User } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  exact: boolean;
  primary?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/",               label: "Início",          Icon: Home,     exact: true },
  { href: "/history",        label: "Histórico",       Icon: Clock,    exact: false },
  { href: "/recommendation", label: "Escolher filme",  Icon: Sparkles, exact: false, primary: true },
  { href: "/watch-later",    label: "Assistir depois", Icon: Bookmark, exact: false },
  { href: "/preferences",    label: "Preferências",    Icon: User,     exact: false },
] as const;

export function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
