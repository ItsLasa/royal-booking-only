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
        header: "Guest Information",
        cell: (info) => {
          const guest = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#061b0e]/10 text-xs font-normal text-[#061b0e] dark:bg-white/10 dark:text-white">
                {guest.firstName[0]}{guest.lastName[0]}
              </span>
              <div>
                <p className="font-medium">{guest.firstName} {guest.lastName}</p>
                <p className="text-xs text-on-surface-variant dark:text-neutral-400">{guest.country ?? "Country not provided"}</p>
              </div>
            </div>
          );
        },
      },
      { header: "Email Address", accessorKey: "email", cell: (info) => <span className="text-on-surface-variant dark:text-neutral-400">{String(info.getValue())}</span> },
      { header: "Telephone", accessorKey: "phone" },
      { header: "Total Stays", accessorKey: "_count.bookings", cell: (info) => <span className="font-normal">{String(info.getValue() ?? 0)}</span> },
      { header: "Marketing Status", accessorKey: "marketingConsent", cell: (info) => (info.getValue() ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Subscribed</span> : <span className="text-xs text-neutral-400">Not Subscribed</span>) },
      { header: "Customer Since", accessorKey: "createdAt", cell: (info) => formatDate(String(info.getValue())) },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Guest Directory"
        description="Comprehensive guest profiles, contact records, stay history, and lifetime value"
        breadcrumbs={[{ label: "Guests" }]}
      />

      <div className="mb-4">
        <Input placeholder="Search by guest name, email, or telephone number…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      </div>

      {error ? (
        <EmptyState title="Could not load guests" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            loading={loading}
            emptyTitle="No guests found"
            emptyDescription="Try searching by a different name, email, or phone number."
            onRowClick={(row) => openGuest(row)}
          />
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={detailLoading ? "Loading guest profile…" : selected ? `${selected.firstName} ${selected.lastName}` : "Guest Profile"}
      >
        {detailLoading && <EmptyState title="Loading guest details…" />}
        {selected && (
          <div className="space-y-6">
            <div className="rounded-xl border border-outline-variant/50 p-4 dark:border-white/10">
              <dl className="grid gap-3 text-sm">
                <dt className="text-xs font-normal uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">Contact Information</dt>
                <dd className="font-medium">{selected.email} · {selected.phone}</dd>
                <dd className="text-on-surface-variant dark:text-neutral-400">{selected.address || selected.country || "No physical address provided"}</dd>
                <dt className="mt-2 text-xs font-normal uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">Total Lifetime Spend</dt>
                <dd className="text-xl font-normal text-primary dark:text-emerald-400">{lkr(selected.totals.spent)}</dd>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-normal">Reservation History</h3>
              {selected.bookings.length === 0 && <p className="text-sm text-on-surface-variant dark:text-neutral-400">No reservations recorded yet.</p>}
              <div className="space-y-2">
                {selected.bookings.map((booking) => (
                  <a key={booking.id} href={`/admin/bookings/${booking.id}`} className="block rounded-lg border border-outline-variant/50 p-3 transition-colors hover:bg-surface-container/50 dark:border-white/10 dark:hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-normal text-primary dark:text-emerald-400">{booking.reference}</p>
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
              <h3 className="mb-2 text-sm font-normal">Private Staff Notes</h3>
              <Field label="Staff Notes (Visible internally only)">
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Guest preferences, VIP requests, special room accommodations…" />
              </Field>
              <Button size="sm" className="mt-2" onClick={saveNotes}>Save Notes</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
