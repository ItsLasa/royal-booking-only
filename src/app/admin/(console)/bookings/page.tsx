"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet } from "@/lib/admin/api";
import type { BookingLite, Paginated } from "@/lib/admin/types";
import { formatDate, lkr, BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, EmptyState, Input, PageHeader, Pagination, Select, StatusBadge } from "@/components/admin/ui";

const STATUSES = ["", "HOLD", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW", "EXPIRED"];
const PAYMENT_STATUSES = ["", "UNPAID", "PARTIALLY_PAID", "PAID", "FAILED", "REFUNDED"];

function BookingsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<BookingLite> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => setSearch(initialSearch), [initialSearch]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    params.set("page", String(page));
    params.set("pageSize", "20");
    adminGet<Paginated<BookingLite>>(`/admin/bookings?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, status, paymentStatus, page]);

  const columns = useMemo<ColumnDef<BookingLite, unknown>[]>(
    () => [
      { accessorKey: "reference", header: "Reference No", cell: (info) => <span className="font-normal text-primary dark:text-emerald-400">{String(info.getValue())}</span> },
      {
        header: "Guest Information",
        cell: (info) => {
          const guest = info.row.original.guest;
          return (
            <div>
              <p className="font-medium">{guest ? `${guest.firstName} ${guest.lastName}` : "—"}</p>
              <p className="text-xs text-on-surface-variant dark:text-neutral-400">{guest?.email ?? ""}</p>
            </div>
          );
        },
      },
      { header: "Package", accessorKey: "package.name", cell: (info) => <span className="text-on-surface-variant dark:text-neutral-400">{String(info.getValue() ?? "—")}</span> },
      { header: "Check-in", accessorKey: "checkInDate", cell: (info) => formatDate(String(info.getValue())) },
      { header: "Check-out", accessorKey: "checkOutDate", cell: (info) => formatDate(String(info.getValue())) },
      { header: "Nights", accessorKey: "nights", cell: (info) => <span className="text-on-surface-variant dark:text-neutral-400">{String(info.getValue())}</span> },
      { header: "Total Amount", accessorKey: "grandTotal", cell: (info) => <span className="font-normal">{lkr(String(info.getValue()))}</span> },
      { header: "Payment", accessorKey: "paymentStatus", cell: (info) => <StatusBadge status={String(info.getValue())} /> },
      { header: "Status", accessorKey: "bookingStatus", cell: (info) => <StatusBadge status={String(info.getValue())} /> },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Reservations & Bookings"
        description="Search, filter, track payment statuses, and manage guest reservations"
        actions={<Button onClick={() => router.push("/admin/bookings/new")}>+ New Reservation</Button>}
        breadcrumbs={[{ label: "Reservations" }]}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <Input placeholder="Search by reference, guest name, email, or phone…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="md:w-48">
          {STATUSES.map((value) => (
            <option key={value} value={value}>{value === "" ? "All Booking Statuses" : (BOOKING_STATUS_LABELS[value] ?? value)}</option>
          ))}
        </Select>
        <Select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }} className="md:w-48">
          {PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>{value === "" ? "All Payment Statuses" : (PAYMENT_STATUS_LABELS[value] ?? value)}</option>
          ))}
        </Select>
      </div>

      {error ? (
        <EmptyState title="Could not load reservations" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            loading={loading}
            emptyTitle="No reservations found"
            emptyDescription="Try adjusting your search criteria or filter selections."
            onRowClick={(row) => router.push(`/admin/bookings/${row.id}`)}
          />
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </div>
      )}
    </div>
  );
}

export default function BookingsListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-neutral-500">Loading bookings...</div>}>
      <BookingsListContent />
    </Suspense>
  );
}
