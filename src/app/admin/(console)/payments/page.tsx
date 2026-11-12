"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet, adminPatch, adminPost } from "@/lib/admin/api";
import type { Paginated, Payment } from "@/lib/admin/types";
import { formatDateTime, lkr } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, EmptyState, Field, Input, PageHeader, Pagination, Select, StatusBadge } from "@/components/admin/ui";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";

const STATUSES = ["", "UNPAID", "PARTIALLY_PAID", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "REFUND_PENDING"];
const PROVIDERS = ["", "PAYHERE", "BANK_TRANSFER", "CASH"];

export default function PaymentsPage() {
  const [data, setData] = useState<Paginated<Payment> | null>(null);
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyTarget, setVerifyTarget] = useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [acting, setActing] = useState(false);

  // manual payment form
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (provider) params.set("provider", provider);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", "20");
    adminGet<Paginated<Payment>>(`/admin/payments?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, provider, search, page]);

  async function verify(payment: Payment) {
    setActing(true);
    try {
      await adminPost(`/admin/payments/${payment.id}/verify`);
      toast.success("Payment verified");
      setVerifyTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setActing(false);
    }
  }

  async function refund() {
    if (!refundTarget) return;
    setActing(true);
    try {
      await adminPost(`/admin/payments/${refundTarget.id}/refund`, { reason: "Refunded from owner console" });
      toast.success("Refund recorded");
      setRefundTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setActing(false);
    }
  }

  async function recordManual(event: React.FormEvent) {
    event.preventDefault();
    if (!bookingId || !amount) return;
    setActing(true);
    try {
      await adminPost("/admin/payments", { bookingId, amount, provider: method, paymentMethod: method === "CASH" ? "Cash" : "Bank transfer", note: note || undefined });
      toast.success("Payment recorded");
      setManualOpen(false);
      setBookingId(""); setAmount(""); setNote("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setActing(false);
    }
  }

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      { header: "Reference", accessorKey: "booking.reference", cell: (info) => <span className="font-semibold">{String(info.getValue() ?? "—")}</span> },
      { header: "Guest", cell: (info) => `${info.row.original.booking?.guest?.firstName ?? ""} ${info.row.original.booking?.guest?.lastName ?? ""}`.trim() || "—" },
      { header: "Provider", accessorKey: "provider", cell: (info) => <span className="capitalize">{String(info.getValue()).replace("_", " ").toLowerCase()}</span> },
      { header: "Amount", accessorKey: "amount", cell: (info) => <span className="font-semibold">{lkr(String(info.getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: (info) => <StatusBadge status={String(info.getValue())} /> },
      { header: "Verified", accessorKey: "verified", cell: (info) => (info.getValue() ? "✓" : "—") },
      { header: "Method", accessorKey: "paymentMethod", cell: (info) => String(info.getValue() ?? "—") },
      { header: "Date", accessorKey: "createdAt", cell: (info) => formatDateTime(String(info.getValue())) },
      {
        header: "Actions",
        cell: (info) => {
          const payment = info.row.original;
          return (
            <div className="flex gap-1.5">
              {payment.provider === "BANK_TRANSFER" && !payment.verified && (
                <Button size="sm" variant="outline" onClick={() => setVerifyTarget(payment)}>Verify</Button>
              )}
              {payment.verified && payment.status !== "REFUNDED" && (
                <Button size="sm" variant="ghost" onClick={() => setRefundTarget(payment)}>Refund</Button>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Verify bank transfers, record cash and process refunds"
        breadcrumbs={[{ label: "Payments" }]}
        actions={<Button onClick={() => setManualOpen(true)}>Record payment</Button>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <Input placeholder="Search booking reference…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="md:w-44">
          {STATUSES.map((value) => <option key={value} value={value}>{value === "" ? "All statuses" : value.replace(/_/g, " ")}</option>)}
        </Select>
        <Select value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }} className="md:w-44">
          {PROVIDERS.map((value) => <option key={value} value={value}>{value === "" ? "All providers" : value.replace(/_/g, " ")}</option>)}
        </Select>
      </div>

      {error ? (
        <EmptyState title="Could not load payments" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable columns={columns} data={data?.items ?? []} loading={loading} emptyTitle="No payments found" />
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        onConfirm={() => verifyTarget && verify(verifyTarget)}
        title="Verify payment"
        message={`Mark the ${lkr(verifyTarget?.amount)} ${verifyTarget?.provider.replace("_", " ")} payment as verified? This confirms the booking.`}
        confirmLabel="Verify payment"
        loading={acting}
        danger={false}
      />

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        onConfirm={refund}
        title="Record refund"
        message={`Refund ${lkr(refundTarget?.amount)} for ${refundTarget?.booking?.reference}? A refund note is added and audited.`}
        confirmLabel="Record refund"
        loading={acting}
      />

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Record manual payment"
        footer={
          <>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button onClick={recordManual} loading={acting} disabled={!bookingId || !amount}>Record</Button>
          </>
        }
      >
        <form onSubmit={recordManual} className="space-y-4">
          <Field label="Booking reference or ID">
            <Input value={bookingId} onChange={(event) => setBookingId(event.target.value)} placeholder="Booking ID" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (LKR)">
              <Input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </Field>
            <Field label="Method">
              <Select value={method} onChange={(event) => setMethod(event.target.value)}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
              </Select>
            </Field>
          </div>
          <Field label="Note (optional)">
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <p className="text-xs text-on-surface-variant dark:text-neutral-500">
            Tip: open a booking and copy its ID from the URL for accurate recording.
          </p>
        </form>
      </Modal>
    </div>
  );
}
