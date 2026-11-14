"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet, adminPost } from "@/lib/admin/api";
import type { AuditLogEntry, Booking, Payment } from "@/lib/admin/types";
import { formatDate, formatDateTime, lkr, relativeTime, BOOKING_SOURCE_LABELS, humanize, getSlipFullUrl } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton, StatusBadge, Tabs } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/admin/Modal";
import { BankSlipModal } from "@/components/admin/BankSlipModal";

type Tab = "summary" | "guest" | "payments" | "activity" | "notes";

function renderChangeJson(entry: AuditLogEntry): ReactNode | null {
  const values = entry.newValues ?? entry.oldValues;
  if (!values) return null;
  return JSON.stringify(values, null, 2) as string;
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<null | { kind: "cancel" | "checkout" | "confirm" }>(null);
  const [selectedSlipPayment, setSelectedSlipPayment] = useState<Payment | null>(null);
  const [showBookingSlipModal, setShowBookingSlipModal] = useState(false);
  const [acting, setActing] = useState(false);

  const load = () => {
    setLoading(true);
    adminGet<Booking>(`/admin/bookings/${params.id}`)
      .then(setBooking)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [params.id]);

  async function runAction(kind: string, body?: Record<string, unknown>) {
    setActing(true);
    try {
      await adminPost(`/admin/bookings/${params.id}/${kind}`, body);
      toast.success("Booking updated");
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  async function runPaymentVerify(paymentId: string) {
    setActing(true);
    try {
      await adminPost(`/admin/payments/${paymentId}/verify`);
      toast.success("Payment verified and booking confirmed!");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setActing(false);
    }
  }

  const paymentColumns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      { header: "Provider", accessorKey: "provider", cell: (info) => <span className="capitalize">{String(info.getValue()).replace("_", " ").toLowerCase()}</span> },
      { header: "Amount", accessorKey: "amount", cell: (info) => <span className="font-normal">{lkr(String(info.getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: (info) => <StatusBadge status={String(info.getValue())} /> },
      {
        header: "Bank Slip",
        cell: (info) => {
          const p = info.row.original;
          const slip = p.slipUrl || booking?.slipUrl;
          if (!slip) return <span className="text-xs text-neutral-400">—</span>;
          return (
            <button
              type="button"
              onClick={() => setSelectedSlipPayment(p)}
              className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
            >
              👁️ View Slip
            </button>
          );
        },
      },
      {
        header: "Verified",
        accessorKey: "verified",
        cell: (info) => (info.getValue() ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ Yes</span> : <span className="text-xs font-medium text-amber-600 dark:text-amber-400">No</span>),
      },
      { header: "Method", accessorKey: "paymentMethod", cell: (info) => String(info.getValue() ?? "—") },
      { header: "Date", accessorKey: "createdAt", cell: (info) => formatDateTime(String(info.getValue())) },
      {
        header: "Actions",
        cell: (info) => {
          const p = info.row.original;
          if (p.provider === "BANK_TRANSFER" && !p.verified) {
            return (
              <Button size="sm" variant="secondary" onClick={() => runPaymentVerify(p.id)} loading={acting}>
                Verify Slip
              </Button>
            );
          }
          return null;
        },
      },
    ],
    [booking?.slipUrl, acting],
  );

  if (loading) {
    return (
      <div>
        <PageHeader title={<Skeleton className="h-7 w-64" />} />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div>
        <PageHeader title="Booking" />
        <EmptyState title="Could not load booking" description={error || "Booking not found."} />
      </div>
    );
  }

  const isActive = ["HOLD", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED"].includes(booking.bookingStatus);
  const checkedIn = Boolean(booking.actualCheckInAt);
  const checkedOut = Boolean(booking.actualCheckOutAt);

  return (
    <div>
      <PageHeader
        title={`Reservation ${booking.reference}`}
        description={`${booking.guest?.firstName} ${booking.guest?.lastName} · ${booking.package?.name ?? "—"} · ${booking.nights} night${booking.nights === 1 ? "" : "s"}`}
        breadcrumbs={[{ label: "Reservations", href: "/admin/bookings" }, { label: booking.reference }]}
        actions={
          <>
            <StatusBadge status={booking.bookingStatus} />
            <StatusBadge status={booking.paymentStatus} />
          </>
        }
      />

      {/* Action bar */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-outline-variant/60 bg-white p-3 dark:border-white/10 dark:bg-[#12171c]">
        {booking.bookingStatus === "CONFIRMED" && !checkedIn && (
          <Button onClick={() => runAction("check-in")}>Check In Guest</Button>
        )}
        {checkedIn && !checkedOut && (
          <Button onClick={() => setConfirm({ kind: "checkout" })} variant="secondary">Check Out Guest</Button>
        )}
        {!["CONFIRMED", "COMPLETED"].includes(booking.bookingStatus) && isActive && (
          <Button onClick={() => runAction("confirm")} variant="secondary">Confirm Reservation</Button>
        )}
        {booking.bookingStatus === "HOLD" && (
          <Button onClick={() => runAction("no-show")} variant="outline">Mark as No-Show</Button>
        )}
        {isActive && !checkedIn && (
          <Button onClick={() => setConfirm({ kind: "cancel" })} variant="danger">Cancel Reservation</Button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: "summary", label: "Reservation Summary" },
          { id: "guest", label: "Guest Details" },
          { id: "payments", label: `Payments (${booking.payments?.length ?? 0})` },
          { id: "activity", label: "Audit Trail" },
          { id: "notes", label: "Internal Notes" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      <div className="mt-5">
        {tab === "summary" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {booking.slipUrl && (
              <Card className="lg:col-span-3 border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                <CardHeader
                  title="Uploaded Bank Transfer Payment Slip"
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowBookingSlipModal(true)}>
                        🔍 Preview Full Slip
                      </Button>
                      {booking.paymentStatus !== "PAID" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            const unverifiedPayment = booking.payments?.find(
                              (p) => p.provider === "BANK_TRANSFER" && !p.verified
                            );
                            if (unverifiedPayment) {
                              runPaymentVerify(unverifiedPayment.id);
                            } else {
                              runAction("confirm");
                            }
                          }}
                          loading={acting}
                        >
                          ✓ Verify Payment Slip
                        </Button>
                      )}
                    </div>
                  }
                />
                <CardBody>
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <div
                      onClick={() => setShowBookingSlipModal(true)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-outline-variant/60 bg-white shadow-sm dark:border-white/10 dark:bg-black/30 w-full sm:w-64 max-h-56 flex items-center justify-center p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getSlipFullUrl(booking.slipUrl)}
                        alt="Bank transfer slip"
                        className="max-h-48 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-1">
                        🔍 Click to Zoom / Preview
                      </div>
                    </div>
                    <div className="space-y-2.5 text-xs flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-on-surface dark:text-white">
                          Payment Proof Attached by Guest
                        </span>
                        {booking.paymentStatus === "PAID" ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            ✓ Payment Verified
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                            ⏳ Pending Admin Verification
                          </span>
                        )}
                      </div>
                      <p className="text-on-surface-variant dark:text-neutral-300 leading-relaxed">
                        The guest uploaded a transaction receipt / bank deposit slip for this booking. Click the preview thumbnail to inspect the document with full zoom and rotation controls.
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowBookingSlipModal(true)}>
                          Preview & Verify
                        </Button>
                        <a
                          href={getSlipFullUrl(booking.slipUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/60 bg-white px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10 transition-colors"
                        >
                          ↗ Open Original / Download
                        </a>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            <Card className="lg:col-span-2">
              <CardHeader title="Stay & Accommodation Details" />
              <CardBody>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Detail label="Check-In Date" value={formatDate(booking.checkInDate)} />
                  <Detail label="Check-Out Date" value={formatDate(booking.checkOutDate)} />
                  <Detail label="Duration" value={`${booking.nights} night${booking.nights === 1 ? "" : "s"}`} />
                  <Detail label="Guest Occupancy" value={`${booking.adults} adults · ${booking.children} children · ${booking.infants} infants`} />
                  <Detail label="Assigned Villa / Room" value={booking.unit?.name ?? "Standard Allocation"} />
                  <Detail label="Booking Channel" value={BOOKING_SOURCE_LABELS[booking.source] ?? humanize(booking.source)} />
                  <Detail label="Actual Check-In" value={formatDateTime(booking.actualCheckInAt)} />
                  <Detail label="Actual Check-Out" value={formatDateTime(booking.actualCheckOutAt)} />
                  <Detail label="Payment Option" value={booking.paymentOption === "DEPOSIT" ? "Deposit Payment Only" : "Full Payment"} />
                  <Detail label="Reservation Created" value={formatDateTime(booking.createdAt)} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Price Breakdown & Balance" />
              <CardBody className="space-y-2.5 text-sm">
                <Row label="Base Accommodation" value={lkr(booking.subtotal)} />
                <Row label="Available Extras & Add-ons" value={lkr(booking.addOnTotal)} />
                <Row label="Discount Applied" value={`-${lkr(booking.discountTotal)}`} />
                <Row label="Service Charge" value={lkr(booking.serviceChargeTotal)} />
                <Row label="Government Tax" value={lkr(booking.taxTotal)} />
                <div className="border-t border-outline-variant/40 pt-2.5 dark:border-white/10">
                  <Row label="Grand Total" value={lkr(booking.grandTotal)} strong />
                  <Row label="Required Deposit" value={lkr(booking.depositRequired)} />
                  <Row label="Amount Paid" value={lkr(booking.amountPaid)} strong />
                  <Row label="Balance Due" value={lkr(booking.balanceDue)} strong />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === "guest" && (
          <Card>
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Guest Full Name" value={`${booking.guest?.firstName} ${booking.guest?.lastName}`} />
                <Detail label="Email Address" value={booking.guest?.email ?? "—"} />
                <Detail label="Phone Number" value={booking.guest?.phone ?? "—"} />
                <Detail label="Country / Region" value={booking.guest?.country ?? "—"} />
                <Detail label="Residential Address" value={booking.guest?.address ?? "—"} />
                <Detail label="ID / Passport Number" value={booking.guest?.identityDocumentReference ?? "—"} />
                <Detail label="Special Requests / Dietary Notes" value={booking.specialRequests ?? "No special requests."} />
              </dl>
            </CardBody>
          </Card>
        )}

        {tab === "payments" && (
          <Card>
            <CardBody>
              <DataTable columns={paymentColumns} data={booking.payments ?? []} emptyTitle="No payments recorded yet" emptyDescription="Use the Payments module to verify bank transfer slips or record manual cash payments." />
            </CardBody>
          </Card>
        )}

        {tab === "activity" && (
          <Card>
            <CardBody>
              {booking.auditTrail?.length ? (
                <ol className="relative space-y-5 border-l border-outline-variant/50 pl-5 dark:border-white/10">
                  {booking.auditTrail.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-[#061b0e] ring-4 ring-white dark:bg-emerald-500 dark:ring-[#12171c]" />
                      <p className="text-sm font-medium">{humanize(entry.action)}</p>
                      <p className="text-xs text-on-surface-variant dark:text-neutral-400">
                        {entry.adminUser?.name ?? "System"} · {formatDateTime(entry.createdAt)} · {relativeTime(entry.createdAt)}
                      </p>
                      {(() => {
                        const json = renderChangeJson(entry);
                        if (!json) return null;
                        return (
                          <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-container/60 p-2 text-[11px] text-on-surface-variant dark:bg-white/5 dark:text-neutral-400">
                            {json}
                          </pre>
                        );
                      })()}
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="No activity yet" description="All future actions and changes will appear in this audit log." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "notes" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Private Staff Notes" />
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-on-surface-variant dark:text-neutral-300">{booking.internalNotes || "No internal staff notes recorded."}</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Cancellation Record" />
              <CardBody>
                <p className="text-sm text-on-surface-variant dark:text-neutral-300">
                  {booking.cancellationReason ? `Reason: ${booking.cancellationReason}` : booking.bookingStatus === "CANCELLED" ? "Cancelled — no specific reason entered." : "Active reservation (Not cancelled)."}
                </p>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm?.kind === "cancel"}
        onClose={() => setConfirm(null)}
        onConfirm={() => runAction("cancel", { reason: "Cancelled by management via admin console" })}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this reservation? The dates will be released and this cancellation will be recorded in the audit trail."
        confirmLabel="Yes, Cancel Reservation"
        loading={acting}
      />
      <ConfirmDialog
        open={confirm?.kind === "checkout"}
        onClose={() => setConfirm(null)}
        onConfirm={() => runAction("check-out")}
        title="Check Out Guest"
        message="Mark this guest as checked out and complete this stay record."
        confirmLabel="Confirm Check-Out"
        loading={acting}
        danger={false}
      />

      {/* Slip Modal from Booking Summary Card */}
      <BankSlipModal
        open={showBookingSlipModal}
        onClose={() => setShowBookingSlipModal(false)}
        slipUrl={booking.slipUrl}
        bookingReference={booking.reference}
        guestName={booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}`.trim() : undefined}
        amount={booking.depositRequired || booking.grandTotal}
        verified={booking.paymentStatus === "PAID"}
        onVerify={() => {
          setShowBookingSlipModal(false);
          const unverifiedPayment = booking.payments?.find(
            (p) => p.provider === "BANK_TRANSFER" && !p.verified
          );
          if (unverifiedPayment) {
            runPaymentVerify(unverifiedPayment.id);
          } else {
            runAction("confirm");
          }
        }}
        verifying={acting}
      />

      {/* Slip Modal from Payments Table Row */}
      <BankSlipModal
        open={Boolean(selectedSlipPayment)}
        onClose={() => setSelectedSlipPayment(null)}
        slipUrl={selectedSlipPayment?.slipUrl || booking.slipUrl}
        bookingReference={booking.reference}
        guestName={booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}`.trim() : undefined}
        amount={selectedSlipPayment?.amount}
        bankReference={selectedSlipPayment?.bankReference}
        verified={selectedSlipPayment?.verified}
        onVerify={() => {
          if (selectedSlipPayment) {
            const pId = selectedSlipPayment.id;
            setSelectedSlipPayment(null);
            runPaymentVerify(pId);
          }
        }}
        verifying={acting}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-normal uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-normal" : "text-on-surface-variant dark:text-neutral-400"}>{label}</span>
      <span className={strong ? "font-normal" : ""}>{value}</span>
    </div>
  );
}
