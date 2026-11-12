"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminGet } from "@/lib/admin/api";
import type { DashboardData } from "@/lib/admin/types";
import { formatDate, lkr, relativeTime } from "@/lib/admin/format";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton, StatCard, Button, StatusBadge } from "@/components/admin/ui";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGet<DashboardData>("/admin/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <EmptyState title="Could not load dashboard" description={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Resort operations at a glance" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const { kpis, charts, arrivals, recentBookings, recentPayments, notifications } = data;
  const revenueChartData = charts.revenueTrend.map((point) => ({ date: point.date.slice(5), revenue: point.revenue }));
  const bookingChartData = charts.bookingTrend.map((point) => ({ date: point.date.slice(5), bookings: point.bookings }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resort operations at a glance"
        actions={
          <>
            <Link href="/admin/bookings/new">
              <Button>New booking</Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline">Block dates</Button>
            </Link>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's revenue" value={lkr(kpis.todayRevenue)} sub={`${lkr(kpis.todayPaid)} collected`} tone="success" />
        <StatCard label="Occupancy" value={`${kpis.occupancyPct}%`} sub={`${kpis.availableRooms} of ${charts.occupancy.available + charts.occupancy.inHouse} rooms available`} />
        <StatCard label="Check-ins today" value={kpis.checkInsToday} sub={`${kpis.checkOutsToday} check-outs`} tone="warning" />
        <StatCard label="Total guests" value={kpis.totalGuests} sub={`${kpis.totalBookings} bookings all time`} />
        <StatCard label="Pending bookings" value={kpis.pendingBookings} sub="Holds awaiting confirmation" tone="warning" />
        <StatCard label="Pending payments" value={kpis.pendingPayments} sub="Unpaid or partially paid" tone="danger" />
        <StatCard label="Rooms available" value={kpis.availableRooms} sub={`${charts.occupancy.inHouse} in house`} tone="success" />
        <StatCard label="Today's check-outs" value={kpis.checkOutsToday} sub="Due to depart" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue trend" subtitle="Gross revenue per day (last 6 months)" />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value) => [lkr(Number(value)), "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#revenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Booking trend" subtitle="New bookings per day (last 3 months)" />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bookingChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="bookings" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Widgets */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Upcoming arrivals" subtitle="Today and future check-ins" action={<Link href="/admin/bookings" className="text-xs font-normal text-[#061b0e] hover:underline dark:text-emerald-400">View all</Link>} />
          <CardBody className="space-y-3">
            {arrivals.length === 0 && <EmptyState title="No upcoming arrivals" />}
            {arrivals.map((booking) => (
              <Link key={booking.id} href={`/admin/bookings/${booking.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-container/60 dark:hover:bg-white/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#061b0e]/5 text-xs font-normal text-[#061b0e] dark:bg-white/10 dark:text-white">
                  {booking.guest ? `${booking.guest.firstName[0]}${booking.guest.lastName[0]}` : "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {booking.guest?.firstName} {booking.guest?.lastName}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant dark:text-neutral-400">
                    {booking.package?.name} · {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
                  </p>
                </div>
                <StatusBadge status={booking.bookingStatus} />
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent bookings" action={<Link href="/admin/bookings" className="text-xs font-normal text-[#061b0e] hover:underline dark:text-emerald-400">View all</Link>} />
          <CardBody className="space-y-3">
            {recentBookings.length === 0 && <EmptyState title="No bookings yet" />}
            {recentBookings.map((booking) => (
              <Link key={booking.id} href={`/admin/bookings/${booking.id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-surface-container/60 dark:hover:bg-white/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-normal">{booking.reference}</p>
                  <p className="truncate text-xs text-on-surface-variant dark:text-neutral-400">{booking.guest?.firstName} {booking.guest?.lastName} · {booking.createdAt ? relativeTime(booking.createdAt) : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{lkr(booking.grandTotal)}</p>
                  <StatusBadge status={booking.paymentStatus} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent payments" action={<Link href="/admin/payments" className="text-xs font-medium text-[#061b0e] hover:underline dark:text-emerald-400">View all</Link>} />
          <CardBody className="space-y-3">
            {recentPayments.length === 0 && <EmptyState title="No payments yet" />}
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{payment.booking?.reference ?? "—"}</p>
                  <p className="truncate text-xs text-on-surface-variant dark:text-neutral-400">{payment.provider.replace("_", " ")} · {relativeTime(payment.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{lkr(payment.amount)}</p>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Activity */}
      <Card className="mt-6">
        <CardHeader title="Recent activity" subtitle="Latest admin actions (audit trail)" />
        <CardBody>
          {notifications.length === 0 && <EmptyState title="No recent activity" />}
          <div className="space-y-3">
            {notifications.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg p-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-[10px] font-normal dark:bg-white/10">
                  {entry.adminUser?.name?.slice(0, 1) ?? "S"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{entry.adminUser?.name ?? "System"}</span>{" "}
                    <span className="text-on-surface-variant dark:text-neutral-400">{entry.action.replace(/_/g, " ").toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-on-surface-variant/70 dark:text-neutral-500">{entry.entityType} · {relativeTime(entry.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
