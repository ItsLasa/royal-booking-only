"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet } from "@/lib/admin/api";
import type { AuditLogEntry, Paginated } from "@/lib/admin/types";
import { formatDateTime, relativeTime, humanize } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState, Input, PageHeader, Pagination, Select } from "@/components/admin/ui";

const ENTITY_LABELS: Record<string, string> = {
  Booking: "Reservations & Bookings",
  Payment: "Payments & Billing",
  AdminUser: "Staff Accounts",
  Unit: "Rooms & Villa Units",
  Package: "Stay Packages",
  AddOn: "Available Extras",
  SeasonalRate: "Seasonal Rates",
  DateRateOverride: "Date Rate Overrides",
  AvailabilityBlock: "Availability Blocks",
  HousekeepingTask: "Housekeeping Tasks",
  MaintenanceIssue: "Maintenance Issues",
  AdminSetting: "Resort Settings",
  AdminSession: "Staff Login Sessions",
};

export default function AuditPage() {
  const [data, setData] = useState<Paginated<AuditLogEntry> | null>(null);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (entityType) params.set("entityType", entityType);
    params.set("page", String(page));
    params.set("pageSize", "25");
    adminGet<Paginated<AuditLogEntry>>(`/admin/audit?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, entityType, page]);

  const columns = useMemo<ColumnDef<AuditLogEntry, unknown>[]>(
    () => [
      {
        header: "Staff Member",
        cell: (info) => {
          const user = info.row.original.adminUser;
          return (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#061b0e]/5 text-[10px] font-normal dark:bg-white/10">
                {user?.name?.[0] ?? "S"}
              </span>
              <div>
                <p className="text-sm font-normal">{user?.name ?? "System"}</p>
                <p className="text-xs text-on-surface-variant dark:text-neutral-500">{user?.role ?? ""}</p>
              </div>
            </div>
          );
        },
      },
      { header: "Action Performed", accessorKey: "action", cell: (info) => <span className="font-medium text-xs text-primary dark:text-emerald-400">{humanize(String(info.getValue()))}</span> },
      { header: "Entity / Resource", accessorKey: "entityType", cell: (info) => <span>{ENTITY_LABELS[String(info.getValue())] ?? String(info.getValue())}</span> },
      { header: "Record ID", accessorKey: "entityId", cell: (info) => <span className="font-mono text-xs text-on-surface-variant dark:text-neutral-400">{String(info.getValue() ?? "—")}</span> },
      { header: "IP Address", accessorKey: "ipAddress", cell: (info) => String(info.getValue() ?? "—") },
      { header: "Timestamp", accessorKey: "createdAt", cell: (info) => <span title={formatDateTime(String(info.getValue()))}>{relativeTime(String(info.getValue()))}</span> },
      {
        header: "Change Details",
        cell: (info) => {
          const values = info.row.original.newValues ?? info.row.original.oldValues;
          if (!values) return <span className="text-on-surface-variant dark:text-neutral-500">—</span>;
          const text = JSON.stringify(values);
          return <span className="block max-w-[220px] truncate font-mono text-[11px] text-on-surface-variant dark:text-neutral-400" title={text}>{text}</span>;
        },
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Activity & Audit Trail"
        description="Immutable real-time audit trail of all staff activities, reservation changes, and configuration updates"
        breadcrumbs={[{ label: "Audit Logs" }]}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <Input placeholder="Search by action, staff name, or resource ID…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1); }} className="md:w-60">
          <option value="">All System Resources</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      {error ? (
        <EmptyState title="Could not load audit logs" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable columns={columns} data={data?.items ?? []} loading={loading} emptyTitle="No audit entries found" />
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </div>
      )}
    </div>
  );
}
