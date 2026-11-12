"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet, adminPatch, adminPost } from "@/lib/admin/api";
import type { AdminUser } from "@/lib/admin/types";
import { formatDate, relativeTime } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, EmptyState, Field, Input, PageHeader, Select, StatusBadge } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Modal";

const ROLES = ["OWNER", "MANAGER", "STAFF", "RECEPTION", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT"];

export default function StaffPage() {
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RECEPTION");

  const load = () => {
    setLoading(true);
    adminGet<{ items: AdminUser[] }>("/admin/staff")
      .then((data) => setStaff(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setActing(true);
    try {
      await adminPost("/admin/staff", { name, email, password, role });
      toast.success("Staff member added");
      setInviteOpen(false);
      setName(""); setEmail(""); setPassword(""); setRole("RECEPTION");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add staff");
    } finally {
      setActing(false);
    }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    setActing(true);
    try {
      await adminPatch(`/admin/staff/${id}`, patch);
      toast.success("Staff updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActing(false);
    }
  }

  const columns = useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      {
        header: "Staff",
        cell: (info) => {
          const member = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#061b0e] text-xs font-bold text-white dark:bg-emerald-600">
                {member.name[0]}
              </span>
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-on-surface-variant dark:text-neutral-400">{member.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        header: "Role",
        accessorKey: "role",
        cell: (info) => (
          <Select
            value={String(info.getValue())}
            onChange={(event) => update(info.row.original.id, { role: event.target.value })}
            className="w-36"
            disabled={acting}
          >
            {ROLES.map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
          </Select>
        ),
      },
      { header: "Status", accessorKey: "active", cell: (info) => <StatusBadge status={info.getValue() ? "CONFIRMED" : "CANCELLED"} label={info.getValue() ? "Active" : "Inactive"} /> },
      { header: "Last login", accessorKey: "lastLoginAt", cell: (info) => (info.getValue() ? relativeTime(String(info.getValue())) : "Never") },
      { header: "Added", accessorKey: "createdAt", cell: (info) => formatDate(String(info.getValue())) },
      {
        header: "Actions",
        cell: (info) => (
          <Button size="sm" variant="outline" onClick={() => update(info.row.original.id, { active: !info.row.original.active })} disabled={acting}>
            {info.row.original.active ? "Deactivate" : "Activate"}
          </Button>
        ),
      },
    ],
    [acting],
  );

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Team members, roles and access"
        breadcrumbs={[{ label: "Staff" }]}
        actions={<Button onClick={() => setInviteOpen(true)}>Add staff</Button>}
      />

      {error ? (
        <EmptyState title="Could not load staff" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable columns={columns} data={staff} loading={loading} emptyTitle="No staff members" emptyDescription="Add your first team member." />
        </div>
      )}

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add staff member"
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={invite} loading={acting}>Add staff</Button>
          </>
        }
      >
        <form onSubmit={invite} className="space-y-4">
          <Field label="Full name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Temporary password" hint="Minimum 8 characters. They can be reset later.">
            <Input type="text" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLES.map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
