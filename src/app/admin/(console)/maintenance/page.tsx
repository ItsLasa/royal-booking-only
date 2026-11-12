"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet, adminPatch, adminPost } from "@/lib/admin/api";
import type { MaintenanceIssue, Paginated, Unit } from "@/lib/admin/types";
import { formatDate, MAINTENANCE_PRIORITY_LABELS, MAINTENANCE_STATUS_LABELS, relativeTime } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, EmptyState, Field, Input, PageHeader, Pagination, Select, StatusBadge, Textarea } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Modal";

const STATUS_FLOW = ["REPORTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"];

export default function MaintenancePage() {
  const [data, setData] = useState<Paginated<MaintenanceIssue> | null>(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [acting, setActing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issuePriority, setIssuePriority] = useState("MEDIUM");
  const [unitId, setUnitId] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    params.set("page", String(page));
    params.set("pageSize", "20");
    adminGet<Paginated<MaintenanceIssue>>(`/admin/maintenance?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    adminGet<{ rooms: { unit: Unit }[] }>("/admin/rooms").then((value) => setUnits(value.rooms.map((row) => row.unit))).catch(() => null);
  }, []);

  async function createIssue(event: React.FormEvent) {
    event.preventDefault();
    setActing(true);
    try {
      await adminPost("/admin/maintenance", { title, description: description || undefined, priority: issuePriority, unitId: unitId || null });
      toast.success("Maintenance issue reported");
      setCreateOpen(false);
      setTitle(""); setDescription(""); setIssuePriority("MEDIUM"); setUnitId("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not report issue");
    } finally {
      setActing(false);
    }
  }

  async function advance(issue: MaintenanceIssue, next: string) {
    setActing(true);
    try {
      await adminPatch(`/admin/maintenance/${issue.id}`, { status: next });
      toast.success(`Issue marked ${MAINTENANCE_STATUS_LABELS[next].toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActing(false);
    }
  }

  const columns = useMemo<ColumnDef<MaintenanceIssue, unknown>[]>(
    () => [
      {
        header: "Issue",
        cell: (info) => {
          const issue = info.row.original;
          return (
            <div>
              <p className="font-medium">{issue.title}</p>
              <p className="text-xs text-on-surface-variant dark:text-neutral-400">{issue.description ?? ""}</p>
            </div>
          );
        },
      },
      { header: "Room", accessorKey: "unit.name", cell: (info) => String(info.getValue() ?? "Property") },
      { header: "Priority", accessorKey: "priority", cell: (info) => <StatusBadge status={String(info.getValue())} label={MAINTENANCE_PRIORITY_LABELS[String(info.getValue())]} /> },
      { header: "Status", accessorKey: "status", cell: (info) => <StatusBadge status={String(info.getValue())} label={MAINTENANCE_STATUS_LABELS[String(info.getValue())]} /> },
      { header: "Assignee", accessorKey: "assignedTo.name", cell: (info) => String(info.getValue() ?? "—") },
      { header: "Reported", accessorKey: "createdAt", cell: (info) => relativeTime(String(info.getValue())) },
      {
        header: "Actions",
        cell: (info) => {
          const issue = info.row.original;
          const index = STATUS_FLOW.indexOf(issue.status);
          if (index < STATUS_FLOW.length - 1) {
            return (
              <Button size="sm" variant="outline" onClick={() => advance(issue, STATUS_FLOW[index + 1])} loading={acting}>
                {STATUS_FLOW[index + 1] === "ASSIGNED" ? "Assign" : STATUS_FLOW[index + 1] === "IN_PROGRESS" ? "Start" : "Complete"}
              </Button>
            );
          }
          return <span className="text-xs text-on-surface-variant dark:text-neutral-500">Resolved {formatDate(issue.resolvedAt)}</span>;
        },
      },
    ],
    [acting],
  );

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Track and resolve property maintenance issues"
        breadcrumbs={[{ label: "Maintenance" }]}
        actions={<Button onClick={() => setCreateOpen(true)}>Report issue</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 md:w-[420px]">
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_FLOW.map((value) => <option key={value} value={value}>{MAINTENANCE_STATUS_LABELS[value]}</option>)}
        </Select>
        <Select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }}>
          <option value="">All priorities</option>
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value} value={value}>{MAINTENANCE_PRIORITY_LABELS[value]}</option>)}
        </Select>
      </div>

      {error ? (
        <EmptyState title="Could not load issues" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable columns={columns} data={data?.items ?? []} loading={loading} emptyTitle="No maintenance issues" emptyDescription="Report the first issue to get started." />
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Report maintenance issue"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createIssue} loading={acting}>Report issue</Button>
          </>
        }
      >
        <form onSubmit={createIssue} className="space-y-4">
          <Field label="Title">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Pool pump not running" required minLength={3} />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <Select value={issuePriority} onChange={(event) => setIssuePriority(event.target.value)}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value} value={value}>{MAINTENANCE_PRIORITY_LABELS[value]}</option>)}
              </Select>
            </Field>
            <Field label="Room (optional)">
              <Select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                <option value="">Property-wide</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </Select>
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
