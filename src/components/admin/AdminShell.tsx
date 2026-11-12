"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { adminGet, adminPost } from "@/lib/admin/api";
import type { AdminUser } from "@/lib/admin/types";
import { Toaster } from "sonner";
import {
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineHomeModern,
  HiOutlineTag,
  HiOutlineCreditCard,
  HiOutlineSparkles,
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
} from "react-icons/hi2";

const NAV = [
  { section: "Operations", items: [
    { href: "/admin", label: "Dashboard", icon: HiOutlineHome, exact: true },
    { href: "/admin/bookings", label: "Bookings", icon: HiOutlineCalendar },
    { href: "/admin/calendar", label: "Calendar", icon: HiOutlineCalendar },
    { href: "/admin/guests", label: "Guests", icon: HiOutlineUserGroup },
    { href: "/admin/rooms", label: "Rooms", icon: HiOutlineHomeModern },
  ]},
  { section: "Commerce", items: [
    { href: "/admin/rates", label: "Rates", icon: HiOutlineTag },
    { href: "/admin/packages", label: "Packages", icon: HiOutlineSparkles },
    { href: "/admin/payments", label: "Payments", icon: HiOutlineCreditCard },
  ]},
  { section: "Property", items: [
    { href: "/admin/housekeeping", label: "Housekeeping", icon: HiOutlineSparkles },
    { href: "/admin/maintenance", label: "Maintenance", icon: HiOutlineWrenchScrewdriver },
    { href: "/admin/reports", label: "Reports", icon: HiOutlineChartBar },
  ]},
  { section: "Administration", items: [
    { href: "/admin/staff", label: "Staff", icon: HiOutlineUsers },
    { href: "/admin/settings", label: "Settings", icon: HiOutlineCog6Tooth },
    { href: "/admin/audit", label: "Audit Logs", icon: HiOutlineClipboardDocumentList },
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

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout }}>
      <div className="min-h-screen bg-[#f4f5f2] text-on-surface dark:bg-[#0b0f13] dark:text-neutral-100">
        <Toaster position="top-right" richColors theme={theme} />

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant/40 bg-[#0d1a12] text-white lg:flex dark:bg-[#0a0f14] dark:border-white/10">
          <SidebarContent pathname={pathname} isActive={isActive} />
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
              <SidebarContent pathname={pathname} isActive={isActive} onNavigate={() => setSidebarOpen(false)} />
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
                placeholder="Search bookings, guests…"
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
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">Notifications</p>
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#061b0e] text-xs font-bold text-white dark:bg-emerald-600">
                    {user?.name?.slice(0, 1).toUpperCase() ?? "?"}
                  </span>
                  <span className="hidden text-left md:block">
                    <span className="block text-sm font-medium leading-tight">{user?.name ?? "Loading…"}</span>
                    <span className="block text-[11px] leading-tight text-on-surface-variant dark:text-neutral-500">{user?.role ?? ""}</span>
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-56 rounded-xl border border-outline-variant/50 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#12171c]">
                    <div className="border-b border-outline-variant/40 px-3 py-2.5 dark:border-white/10">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-on-surface-variant dark:text-neutral-400">{user?.email}</p>
                    </div>
                    <Link href="/admin/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-container dark:hover:bg-white/10">
                      <HiOutlineCog6Tooth className="h-4 w-4" /> Settings
                    </Link>
                    <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error hover:bg-error/5 dark:hover:bg-rose-500/10">
                      <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
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
        <p className="text-sm  leading-tight tracking-wide">Admin Console</p>
        <p className="text-[12px] leading-tight text-emerald-300/70">Royal Mansion Resort</p>
      </div>
    </div>
  );
}

function SidebarContent({ pathname, isActive, onNavigate }: { pathname: string; isActive: (href: string, exact?: boolean) => boolean; onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6" aria-label="Admin navigation">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/50 dark:text-neutral-500">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/30" : "text-neutral-300/80 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px]", active ? "text-emerald-300" : "text-neutral-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[11px] text-neutral-400">v1.0 · Production console</p>
      </div>
    </>
  );
}
