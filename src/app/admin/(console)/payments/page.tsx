"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet, adminPatch, adminPost } from "@/lib/admin/api";
import type { Paginated, Payment } from "@/lib/admin/types";
import { formatDateTime, lkr, PAYMENT_PROVIDER_LABELS, PAYMENT_STATUS_LABELS, humanize } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, EmptyState, Field, Input, PageHeader, Pagination, Select, StatusBadge } from "@/components/admin/ui";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { BankSlipModal } from "@/components/admin/BankSlipModal";

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
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);
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
      { header: "Reservation Ref", accessorKey: "booking.reference", cell: (info) => <span className="font-normal text-primary dark:text-emerald-400">{String(info.getValue() ?? "—")}</span> },
      { header: "Guest Name", cell: (info) => `${info.row.original.booking?.guest?.firstName ?? ""} ${info.row.original.booking?.guest?.lastName ?? ""}`.trim() || "—" },
      { header: "Payment Gateway", accessorKey: "provider", cell: (info) => <span>{PAYMENT_PROVIDER_LABELS[String(info.getValue())] ?? humanize(String(info.getValue()))}</span> },
      { header: "Amount Paid", accessorKey: "amount", cell: (info) => <span className="font-normal">{lkr(String(info.getValue()))}</span> },
      { header: "Payment Status", accessorKey: "status", cell: (info) => <StatusBadge status={String(info.getValue())} /> },
      {
        header: "Bank Slip",
        cell: (info) => {
          const payment = info.row.original;
          const hasSlip = Boolean(payment.slipUrl);
          return (
            <div className="flex flex-col gap-1 items-start">
              {payment.provider === "BANK_TRANSFER" ? (
                payment.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    ⏳ Unverified
                  </span>
                )
              ) : (
                <span className="text-xs text-neutral-400">—</span>
              )}
              {hasSlip && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewPayment(payment);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                >
                  👁️ Preview Slip
                </button>
              )}
            </div>
          );
        },
      },
      { header: "Method", accessorKey: "paymentMethod", cell: (info) => String(info.getValue() ?? "—") },
      { header: "Transaction Date", accessorKey: "createdAt", cell: (info) => formatDateTime(String(info.getValue())) },
      {
        header: "Actions",
        cell: (info) => {
          const payment = info.row.original;
          const hasSlip = Boolean(payment.slipUrl);
          return (
            <div className="flex items-center gap-1.5">
              {hasSlip && (
                <Button size="sm" variant="outline" onClick={() => setPreviewPayment(payment)}>
                  Preview Slip
                </Button>
              )}
              {payment.provider === "BANK_TRANSFER" && !payment.verified && (
                <Button size="sm" variant="secondary" onClick={() => setVerifyTarget(payment)}>
                  Verify
                </Button>
              )}
              {payment.verified && payment.status !== "REFUNDED" && (
                <Button size="sm" variant="ghost" onClick={() => setRefundTarget(payment)}>
                  Issue Refund
                </Button>
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
        title="Payments & Billing Transactions"
        description="Review payment gateway transactions, verify bank transfer slips, record cash payments, and issue refunds"
        breadcrumbs={[{ label: "Payments" }]}
        actions={<Button onClick={() => setManualOpen(true)}>+ Record Manual Payment</Button>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <Input placeholder="Search by reservation reference number…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="md:w-48">
          {STATUSES.map((value) => (
            <option key={value} value={value}>{value === "" ? "All Payment Statuses" : (PAYMENT_STATUS_LABELS[value] ?? value)}</option>
          ))}
        </Select>
        <Select value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }} className="md:w-48">
          {PROVIDERS.map((value) => (
            <option key={value} value={value}>{value === "" ? "All Payment Methods" : (PAYMENT_PROVIDER_LABELS[value] ?? value)}</option>
          ))}
        </Select>
      </div>

      {error ? (
        <EmptyState title="Could not load payments" description={error} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white dark:border-white/10 dark:bg-[#12171c]">
          <DataTable columns={columns} data={data?.items ?? []} loading={loading} emptyTitle="No payments recorded yet" emptyDescription="Online and manual transactions will show here." />
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        onConfirm={() => verifyTarget && verify(verifyTarget)}
        title="Verify Bank Transfer Payment"
        message={`Mark the ${lkr(verifyTarget?.amount)} bank transfer payment as verified? This confirms the reservation and notifies the guest.`}
        confirmLabel="Confirm Verification"
        loading={acting}
        danger={false}
      />

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        onConfirm={refund}
        title="Record / Process Refund"
        message={`Issue a recorded refund of ${lkr(refundTarget?.amount)} for reservation ${refundTarget?.booking?.reference}? This action is audited.`}
        confirmLabel="Confirm Refund"
        loading={acting}
      />

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Record Manual Payment"
        footer={
          <>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button onClick={recordManual} loading={acting} disabled={!bookingId || !amount}>Save Payment</Button>
          </>
        }
      >
        <form onSubmit={recordManual} className="space-y-4">
          <Field label="Reservation Reference or Booking ID">
            <Input value={bookingId} onChange={(event) => setBookingId(event.target.value)} placeholder="e.g. RMV-XXXXXX or UUID" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount Paid (LKR)">
              <Input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 50000" required />
            </Field>
            <Field label="Payment Method">
              <Select value={method} onChange={(event) => setMethod(event.target.value)}>
                <option value="CASH">Cash at Front Desk</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              </Select>
            </Field>
          </div>
          <Field label="Staff Note / Receipt Reference (Optional)">
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Bank slip reference #12345 or Cash receipt #098" />
          </Field>
        </form>
      </Modal>

      <BankSlipModal
        open={Boolean(previewPayment)}
        onClose={() => setPreviewPayment(null)}
        slipUrl={previewPayment?.slipUrl}
        bookingReference={previewPayment?.booking?.reference}
        guestName={
          previewPayment?.booking?.guest
            ? `${previewPayment.booking.guest.firstName} ${previewPayment.booking.guest.lastName}`.trim()
            : undefined
        }
        amount={previewPayment?.amount}
        bankReference={previewPayment?.bankReference}
        verified={previewPayment?.verified}
        onVerify={() => {
          if (previewPayment) {
            setPreviewPayment(null);
            verify(previewPayment);
          }
        }}
        verifying={acting}
      />
    </div>
  );
}
