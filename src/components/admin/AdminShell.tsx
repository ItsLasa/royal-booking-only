"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { adminGet, adminPost } from "@/lib/admin/api";
import type { AdminUser } from "@/lib/admin/types";
import { Toaster, toast } from "sonner";
import {
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineHomeModern,
  HiOutlineTag,
  HiOutlineCreditCard,
  HiOutlineSparkles,
  HiOutlineSquaresPlus,
  HiOutlineWrenchScrewdriver,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineCog6Tooth,
  HiOutlineClipboardDocumentList,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineBell,
  HiOutlineArrowRightOnRectangle,
  HiOutlineMagnifyingGlass,
  HiBars3,
  HiOutlineXMark,
  HiOutlineLockClosed,
} from "react-icons/hi2";

export const RESTRICTED_ROUTES = [
  "/admin/rates",
  "/admin/packages",
  "/admin/add-ons",
  "/admin/staff",
  "/admin/settings",
  "/admin/audit",
];

export function isManagerOrOwner(user?: AdminUser | null): boolean {
  if (!user) return false;
  return user.role === "OWNER" || user.role === "MANAGER";
}

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  restricted?: boolean;
};

export type NavGroup = {
  section: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  { section: "Operations", items: [
    { href: "/admin", label: "Dashboard", icon: HiOutlineHome, exact: true },
    { href: "/admin/bookings", label: "Reservations", icon: HiOutlineCalendar },
    { href: "/admin/calendar", label: "Availability Calendar", icon: HiOutlineCalendar },
    { href: "/admin/guests", label: "Guest Directory", icon: HiOutlineUserGroup },
    { href: "/admin/rooms", label: "Rooms & Units", icon: HiOutlineHomeModern },
  ]},
  { section: "Commerce", items: [
    { href: "/admin/rates", label: "Rates & Pricing", icon: HiOutlineTag, restricted: true },
    { href: "/admin/packages", label: "Stay Packages", icon: HiOutlineSparkles, restricted: true },
    { href: "/admin/add-ons", label: "Extras & Add-ons", icon: HiOutlineSquaresPlus, restricted: true },
    { href: "/admin/payments", label: "Payments & Billing", icon: HiOutlineCreditCard },
  ]},
  { section: "Property", items: [
    { href: "/admin/housekeeping", label: "Housekeeping Board", icon: HiOutlineSparkles },
    { href: "/admin/maintenance", label: "Maintenance Issues", icon: HiOutlineWrenchScrewdriver },
    { href: "/admin/reports", label: "Reports & Analytics", icon: HiOutlineChartBar },
  ]},
  { section: "Administration", items: [
    { href: "/admin/staff", label: "Staff Accounts", icon: HiOutlineUsers, restricted: true },
    { href: "/admin/settings", label: "Resort Settings", icon: HiOutlineCog6Tooth, restricted: true },
    { href: "/admin/audit", label: "Activity & Audit Trail", icon: HiOutlineClipboardDocumentList, restricted: true },
  ]},
];

type SessionContextValue = { user: AdminUser | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> };
const SessionContext = createContext<SessionContextValue>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function useSession() {
  return useContext(SessionContext);
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = (localStorage.getItem("rmv-theme") as "light" | "dark" | null) ?? "light";
    setTheme(stored);
    document.documentElement.classList.toggle("dark", stored === "dark");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("rmv-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };
  return { theme, toggle };
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [restrictedModal, setRestrictedModal] = useState<{ open: boolean; title: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const refresh = async () => {
    try {
      const data = await adminGet<{ user: AdminUser }>("/admin/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
      router.replace("/admin/login");
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await adminPost("/admin/auth/logout").catch(() => null);
    setUser(null);
    router.replace("/admin/login");
  };

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const isCurrentRouteRestricted = useMemo(() => {
    return RESTRICTED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  }, [pathname]);

  const hasAccessToCurrentRoute = useMemo(() => {
    if (!isCurrentRouteRestricted) return true;
    return isManagerOrOwner(user);
  }, [isCurrentRouteRestricted, user]);

  const handleRestrictedAccessNotice = (title: string) => {
    toast.error("Allow only Admin and Manager", {
      description: `Access to "${title}" is permitted only for Resort Administrators and Managers.`,
    });
    setRestrictedModal({ open: true, title });
  };

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout }}>
      <div className="min-h-screen bg-[#f4f5f2] text-on-surface dark:bg-[#0b0f13] dark:text-neutral-100">
        <Toaster position="top-right" richColors theme={theme} />

        {/* Access Denied Modal Alert */}
        {restrictedModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRestrictedModal(null)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-outline-variant/60 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#12171c]">
              <div className="flex items-center gap-3">
                
                <div>
                  <h3 className="text-base font-bold text-on-surface dark:text-white">Access Restricted</h3>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Allow only Admin and Manager
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-on-surface-variant dark:text-neutral-300">
                The section <strong>&ldquo;{restrictedModal.title}&rdquo;</strong> is restricted. Your current account role is{" "}
                <span className="font-semibold text-amber-700 dark:text-amber-400">{user?.role ?? "Guest"}</span>, which does not have permission to view or manage this area.
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setRestrictedModal(null)}
                  className="rounded-lg bg-[#061b0e] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a2f19] dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  Understand & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant/40 bg-[#0d1a12] text-white lg:flex dark:bg-[#0a0f14] dark:border-white/10">
          <SidebarContent
            pathname={pathname}
            isActive={isActive}
            user={user}
            onRestrictedClick={handleRestrictedAccessNotice}
          />
        </aside>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#0d1a12] text-white dark:bg-[#0a0f14]">
              <div className="flex items-center justify-between px-5 py-4">
                <Brand />
                <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent
                pathname={pathname}
                isActive={isActive}
                user={user}
                onNavigate={() => setSidebarOpen(false)}
                onRestrictedClick={handleRestrictedAccessNotice}
              />
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="flex min-h-screen flex-col lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-outline-variant/40 bg-white/85 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0f151b]/85 md:px-6">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container lg:hidden dark:text-neutral-300 dark:hover:bg-white/10">
              <HiBars3 className="h-5 w-5" />
            </button>

            <div className="relative hidden max-w-sm flex-1 md:block">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60 dark:text-neutral-500" />
              <input
                placeholder="Search reservations, guests, references…"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && event.currentTarget.value.trim()) router.push(`/admin/bookings?search=${encodeURIComponent(event.currentTarget.value.trim())}`);
                }}
                className="h-9 w-full rounded-lg border border-outline-variant/60 bg-surface-container/50 pl-9 pr-3 text-sm focus:border-[#061b0e] focus:outline-none focus:ring-2 focus:ring-[#061b0e]/20 dark:border-white/10 dark:bg-white/5 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
              />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={toggle} aria-label="Toggle theme" className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container dark:text-neutral-300 dark:hover:bg-white/10">
                {theme === "dark" ? <HiOutlineSun className="h-5 w-5" /> : <HiOutlineMoon className="h-5 w-5" />}
              </button>

              <div className="relative">
                <button onClick={() => setNotifOpen((open) => !open)} aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container dark:text-neutral-300 dark:hover:bg-white/10">
                  <HiOutlineBell className="h-5 w-5" />
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 rounded-xl border border-outline-variant/50 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#12171c]">
                    <p className="px-3 py-2 text-xs font-normal uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">Notifications</p>
                    <p className="px-3 py-6 text-center text-sm text-on-surface-variant dark:text-neutral-400">No new notifications</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  className="ml-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-container dark:hover:bg-white/10"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#061b0e] text-xs font-normal text-white dark:bg-emerald-600">
                    {user?.name?.slice(0, 1).toUpperCase() ?? "?"}
                  </span>
                  <span className="hidden text-left md:block">
                    <span className="block text-sm font-normal leading-tight">{user?.name ?? "Loading…"}</span>
                    <span className="block text-[11px] leading-tight text-on-surface-variant dark:text-neutral-500">{user?.role ?? ""}</span>
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-60 rounded-xl border border-outline-variant/50 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#12171c]">
                    <div className="border-b border-outline-variant/40 px-3 py-2.5 dark:border-white/10">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-on-surface-variant dark:text-neutral-400">{user?.email}</p>
                      <span className="mt-1 inline-block rounded bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-white/10 dark:text-emerald-300">
                        Role: {user?.role ?? "Guest"}
                      </span>
                    </div>
                    <Link
                      href="/admin/settings"
                      onClick={(e) => {
                        if (!isManagerOrOwner(user)) {
                          e.preventDefault();
                          setMenuOpen(false);
                          handleRestrictedAccessNotice("Resort Settings");
                          return;
                        }
                        setMenuOpen(false);
                      }}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-surface-container dark:hover:bg-white/10"
                    >
                      <span className="flex items-center gap-2">
                        <HiOutlineCog6Tooth className="h-4 w-4" /> Resort Settings
                      </span>
                      {!isManagerOrOwner(user) && (
                        <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          <HiOutlineLockClosed className="h-3 w-3" /> Admin
                        </span>
                      )}
                    </Link>
                    <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error hover:bg-error/5 dark:hover:bg-rose-500/10">
                      <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto max-w-[1400px]">
              {!loading && user && !hasAccessToCurrentRoute ? (
                <RestrictedRouteScreen
                  user={user}
                  pathname={pathname}
                  onReturn={() => router.push("/admin")}
                />
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div>
        <p className="text-sm font-normal leading-tight tracking-wide">Management Console</p>
        <p className="text-[12px] leading-tight text-emerald-300/80">Royal Mansion Resort & Villa</p>
      </div>
    </div>
  );
}

function RestrictedRouteScreen({
  user,
  pathname,
  onReturn,
}: {
  user: AdminUser;
  pathname: string;
  onReturn: () => void;
}) {
  const matchingItem = NAV.flatMap((g) => g.items).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const sectionName = matchingItem?.label ?? "this section";

  return (
    <div className="mx-auto my-12 max-w-xl rounded-2xl border border-outline-variant/60 bg-white p-8 sm:p-12 text-center shadow-xl dark:border-white/10 dark:bg-[#12171c]">
      
      <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-700 dark:bg-red-950/60 dark:text-red-300">
        Access Restricted
      </span>
      <h2 className="mt-3 text-2xl font-bold text-on-surface dark:text-white">
        Allow only Admin and Manager
      </h2>
      <p className="mt-3 text-sm text-on-surface-variant dark:text-neutral-400 leading-relaxed">
        You do not have permission to access <strong>{sectionName}</strong>. This administrative feature is reserved exclusively for resort <strong>Owners</strong> and <strong>Managers</strong>.
      </p>
      <div className="mt-5 rounded-lg border border-outline-variant/40 bg-surface-container/40 p-3.5 text-xs text-neutral-600 dark:border-white/5 dark:bg-white/5 dark:text-neutral-300">
        Currently logged in as: <span className="font-semibold text-neutral-900 dark:text-white">{user.name}</span> (<span className="font-medium text-amber-700 dark:text-amber-400">{user.role}</span>)
      </div>
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
        <button
          onClick={onReturn}
          className="rounded-lg bg-[#061b0e] px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-[#0a2f19] dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
        >
          Return to Dashboard
        </button>
        <Link
          href="/admin/bookings"
          className="rounded-lg border border-outline-variant/60 bg-white px-5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-colors"
        >
          View Reservations
        </Link>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  isActive,
  user,
  onNavigate,
  onRestrictedClick,
}: {
  pathname: string;
  isActive: (href: string, exact?: boolean) => boolean;
  user: AdminUser | null;
  onNavigate?: () => void;
  onRestrictedClick: (title: string) => void;
}) {
  return (
    <>
      <Brand />
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6" aria-label="Admin navigation">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-1.5 text-[10px] font-normal uppercase tracking-[0.18em] text-emerald-200/50 dark:text-neutral-500">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const isRestrictedForUser = item.restricted && !isManagerOrOwner(user);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (isRestrictedForUser) {
                        e.preventDefault();
                        onRestrictedClick(item.label);
                        return;
                      }
                      onNavigate?.();
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-normal transition-all",
                      active
                        ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/30"
                        : isRestrictedForUser
                        ? "text-neutral-400/60 hover:bg-white/5 hover:text-neutral-200 cursor-pointer"
                        : "text-neutral-300/80 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", active ? "text-emerald-300" : "text-neutral-400")} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isRestrictedForUser && (
                      <span
                        title="Restricted: Allowed only for Admin and Manager"
                        className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90"
                      >
                        <HiOutlineLockClosed className="h-3 w-3" />
                        <span className="hidden sm:inline">Admin</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[11px] text-neutral-400">Royal Mansion PMS · Hotel Console</p>
      </div>
    </>
  );
}
