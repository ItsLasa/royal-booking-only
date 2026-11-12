"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminGet } from "@/lib/admin/api";
import { lkr, BOOKING_SOURCE_LABELS, PAYMENT_PROVIDER_LABELS, PAYMENT_STATUS_LABELS, humanize } from "@/lib/admin/format";
import { Button, Card, CardBody, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";
import { ADMIN_API_BASE } from "@/lib/admin/api";

type RevenueReport = {
  byMonth: { month: string; revenue: number; paid: number; bookings: number }[];
  bySource: { source: string; bookings: number; revenue: number }[];
  byPackage: { packageId: string; name: string; bookings: number; revenue: number; paid: number }[];
  totals: { revenue: number; paid: number; bookings: number };
};

type OccupancyReport = { from: string; to: string; totalNights: number; capacity: number; capacityNights: number; soldNights: number; occupancyPct: number; adr: number; revpar: number; bookings: number };

type PaymentsReport = {
  payments: unknown[];
  byProvider: { provider: string; count: number; total: number; refunded: number }[];
  byStatus: { status: string; count: number }[];
  totals: { collected: number; refunded: number; count: number };
};

const COLORS = ["#059669", "#0d9488", "#d97706", "#dc2626", "#7c3aed", "#2563eb"];

export default function ReportsPage() {
  const [tab, setTab] = useState<"revenue" | "occupancy" | "payments">("revenue");
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null);
  const [payments, setPayments] = useState<PaymentsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const year = new Date().getFullYear();
    Promise.all([
      adminGet<RevenueReport>("/admin/reports/revenue").then(setRevenue).catch(() => setRevenue(null)),
      adminGet<OccupancyReport>(`/admin/reports/occupancy?from=${year}-01-01&to=${year}-12-31`).then(setOccupancy).catch(() => setOccupancy(null)),
      adminGet<PaymentsReport>("/admin/reports/payments").then(setPayments).catch(() => setPayments(null)),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageHeader title="Reports" description="Loading…" />;
  if (error) return <EmptyState title="Could not load reports" description={error} />;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics Dashboard"
        description="Revenue performance, room occupancy rates, ADR, RevPAR, and gateway transaction summaries"
        breadcrumbs={[{ label: "Reports" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => window.open(`${ADMIN_API_BASE}/admin/reports/export/bookings`, "_blank")}>Export Bookings (.CSV)</Button>
            <Button variant="outline" onClick={() => window.open(`${ADMIN_API_BASE}/admin/reports/export/payments`, "_blank")}>Export Payments (.CSV)</Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "revenue", label: "Revenue Performance" },
          { key: "occupancy", label: "Occupancy & Yield" },
          { key: "payments", label: "Payment Gateways" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as "revenue" | "occupancy" | "payments")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-[#061b0e] text-white dark:bg-emerald-600" : "bg-white text-on-surface-variant hover:bg-surface-container dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "revenue" && revenue && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Gross Revenue" value={lkr(revenue.totals.revenue)} tone="success" />
            <StatCard label="Collected & Settled" value={lkr(revenue.totals.paid)} />
            <StatCard label="Total Confirmed Bookings" value={revenue.totals.bookings} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Monthly Revenue & Collections" subtitle="Gross booked vs actual collected per month" />
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenue.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={(value) => lkr(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Booked Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paid" name="Collected Revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Revenue by Booking Channel" subtitle="Distribution across direct booking engine & OTAs" />
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={revenue.bySource} dataKey="revenue" nameKey="source" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {revenue.bySource.map((entry, index) => <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => lkr(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {revenue.bySource.map((entry, index) => (
                    <span key={entry.source} className="flex items-center gap-1.5 text-xs text-on-surface-variant dark:text-neutral-400">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {BOOKING_SOURCE_LABELS[entry.source] ?? humanize(entry.source)} · {entry.bookings} stays
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Package Revenue Performance" subtitle="Breakdown of earnings by stay package" />
            <CardBody>
              <div className="space-y-3">
                {revenue.byPackage.map((pkg) => (
                  <div key={pkg.packageId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-normal">{pkg.name}</span>
                      <span className="text-on-surface-variant dark:text-neutral-400">{pkg.bookings} reservations · {lkr(pkg.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container dark:bg-white/10">
                      <div className="h-full rounded-full bg-[#059669]" style={{ width: `${Math.min(100, (pkg.revenue / Math.max(1, revenue.totals.revenue)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "occupancy" && occupancy && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Average Occupancy" value={`${occupancy.occupancyPct}%`} tone="success" />
            <StatCard label="ADR (Average Daily Rate)" value={lkr(occupancy.adr)} sub="Revenue earned per occupied room" />
            <StatCard label="RevPAR" value={lkr(occupancy.revpar)} sub="Revenue per available room" />
            <StatCard label="Room Nights Sold" value={occupancy.soldNights} sub={`${occupancy.capacityNights} total capacity nights`} />
          </div>
          <Card>
            <CardBody>
              <p className="text-sm text-on-surface-variant dark:text-neutral-400">
                Reporting Period: {occupancy.from} → {occupancy.to} · Total Capacity: {occupancy.capacity} room units · {occupancy.totalNights} calendar nights · {occupancy.bookings} reservations served.
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "payments" && payments && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Collected" value={lkr(payments.totals.collected)} tone="success" />
            <StatCard label="Total Refunded" value={lkr(payments.totals.refunded)} tone="danger" />
            <StatCard label="Processed Transactions" value={payments.totals.count} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Collections by Payment Method" subtitle="Breakdown by gateway provider" />
              <CardBody>
                <div className="space-y-3">
                  {payments.byProvider.map((provider) => (
                    <div key={provider.provider} className="flex items-center justify-between rounded-lg bg-surface-container/50 px-3 py-2.5 text-sm dark:bg-white/5">
                      <span className="font-normal">{PAYMENT_PROVIDER_LABELS[provider.provider] ?? humanize(provider.provider)}</span>
                      <span className="text-on-surface-variant dark:text-neutral-400">{provider.count} transactions · {lkr(provider.total)}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Transactions by Payment Status" subtitle="Settlement and payment state counts" />
              <CardBody>
                <div className="space-y-3">
                  {payments.byStatus.map((entry) => (
                    <div key={entry.status} className="flex items-center justify-between rounded-lg bg-surface-container/50 px-3 py-2.5 text-sm dark:bg-white/5">
                      <span className="font-normal">{PAYMENT_STATUS_LABELS[entry.status] ?? humanize(entry.status)}</span>
                      <span className="font-medium">{entry.count} transactions</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
