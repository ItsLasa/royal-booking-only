"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet, adminPatch } from "@/lib/admin/api";
import type { Guest, Paginated } from "@/lib/admin/types";
import { formatDate, lkr } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, Card, CardBody, EmptyState, Field, Input, PageHeader, Pagination, StatusBadge, Textarea } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Modal";

type GuestDetail = Guest & { bookings: (import("@/lib/admin/types").BookingLite & { payments?: import("@/lib/admin/types").Payment[] })[]; totals: { spent: string } };

export default function GuestsPage() {
  const [data, setData] = useState<Paginated<Guest> | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<GuestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", "20");
    adminGet<Paginated<Guest>>(`/admin/guests?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, page]);

  async function openGuest(guest: Guest) {
    setSelected(null);
    setDetailLoading(true);
    try {
      const detail = await adminGet<GuestDetail>(`/admin/guests/${guest.id}`);
      setSelected(detail);
      setNotes(detail.internalNotes ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load guest");
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    try {
      await adminPatch(`/admin/guests/${selected.id}`, { internalNotes: notes || null });
      toast.success("Guest notes saved");
      if (selected) setSelected({ ...selected, internalNotes: notes });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save notes");
    }
  }

  const columns = useMemo<ColumnDef<Guest, unknown>[]>(
    () => [
      {
        header: "Guest",
        cell: (info) => {
          const guest = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#061b0e]/5 text-xs font-bold dark:bg-white/10">
                {guest.firstName[0]}{guest.lastName[0]}
              </span>
              <div>
                <p className="font-medium">{guest.firstName} {guest.lastName}</p>
                <p className="text-xs text-on-surface-variant dark:text-neutral-400">{guest.country ?? ""}</p>
              </div>
            </div>
          );
        },
      },
      { header: "Email", accessorKey: "email", cell: (info) => <span className="text-on-surface-variant dark:text-neutral-400">{String(info.getValue())}</span> },
      { header: "Phone", accessorKey: "phone" },
      { header: "Bookings", accessorKey: "_count.bookings", cell: (info) => <span className="font-semibold">{String(info.getValue() ?? 0)}</span> },
      { header: "Marketing", accessorKey: "marketingConsent", cell: (info) => (info.getValue() ? "Consent" : "—") },
      { header: "Since", accessorKey: "createdAt", cell: (info) => formatDate(String(info.getValue())) },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Guests"
        description="Guest directory with booking history"
        breadcrumbs={[{ label: "Guests" }]}
      />

      <div className="mb-4">
        <Input placeholder="Search name, email or phone…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      </div>

      {error ? (
        <EmptyState title="Could not load guests" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable columns={columns} data={data?.items ?? []} loading={loading} emptyTitle="No guests found" onRowClick={(row) => openGuest(row)} />
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={detailLoading ? "Loading guest…" : selected ? `${selected.firstName} ${selected.lastName}` : "Guest"}
      >
        {detailLoading && <EmptyState title="Loading…" />}
        {selected && (
          <div className="space-y-6">
            <div className="rounded-xl border border-outline-variant/50 p-4 dark:border-white/10">
              <dl className="grid gap-3 text-sm">
                <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">Contact</dt>
                <dd>{selected.email} · {selected.phone}</dd>
                <dd className="text-on-surface-variant dark:text-neutral-400">{selected.address || selected.country || "No address"}</dd>
                <dt className="mt-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">Lifetime spend</dt>
                <dd className="text-lg font-bold">{lkr(selected.totals.spent)}</dd>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Booking history</h3>
              {selected.bookings.length === 0 && <p className="text-sm text-on-surface-variant dark:text-neutral-400">No bookings yet.</p>}
              <div className="space-y-2">
                {selected.bookings.map((booking) => (
                  <a key={booking.id} href={`/admin/bookings/${booking.id}`} className="block rounded-lg border border-outline-variant/50 p-3 transition-colors hover:bg-surface-container/50 dark:border-white/10 dark:hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{booking.reference}</p>
                      <StatusBadge status={booking.bookingStatus} />
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant dark:text-neutral-400">
                      {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)} · {booking.nights} nights · {lkr(booking.grandTotal)}
                    </p>
                    <p className="mt-0.5 text-xs text-on-surface-variant dark:text-neutral-500">{booking.package?.name}</p>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Internal notes</h3>
              <Field label="Notes (visible to staff only)">
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Preferences, documents, review notes…" />
              </Field>
              <Button size="sm" className="mt-2" onClick={saveNotes}>Save notes</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
