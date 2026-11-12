"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { adminGet, adminPost } from "@/lib/admin/api";
import type { AuditLogEntry, Booking, Payment } from "@/lib/admin/types";
import { formatDate, formatDateTime, lkr, relativeTime } from "@/lib/admin/format";
import { DataTable } from "@/components/admin/DataTable";
import { Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton, StatusBadge, Tabs } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/admin/Modal";

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

  const paymentColumns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      { header: "Provider", accessorKey: "provider", cell: (info) => <span className="capitalize">{String(info.getValue()).replace("_", " ").toLowerCase()}</span> },
      { header: "Amount", accessorKey: "amount", cell: (info) => <span className="font-semibold">{lkr(String(info.getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: (info) => <StatusBadge status={String(info.getValue())} /> },
      { header: "Verified", accessorKey: "verified", cell: (info) => (info.getValue() ? "Yes" : "No") },
      { header: "Method", accessorKey: "paymentMethod", cell: (info) => String(info.getValue() ?? "—") },
      { header: "Date", accessorKey: "createdAt", cell: (info) => formatDateTime(String(info.getValue())) },
    ],
    [],
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
        title={`Booking ${booking.reference}`}
        description={`${booking.guest?.firstName} ${booking.guest?.lastName} · ${booking.package?.name ?? "—"} · ${booking.nights} night${booking.nights === 1 ? "" : "s"}`}
        breadcrumbs={[{ label: "Bookings", href: "/admin/bookings" }, { label: booking.reference }]}
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
          <Button onClick={() => runAction("check-in")}>Check in</Button>
        )}
        {checkedIn && !checkedOut && (
          <Button onClick={() => setConfirm({ kind: "checkout" })} variant="secondary">Check out</Button>
        )}
        {!["CONFIRMED", "COMPLETED"].includes(booking.bookingStatus) && isActive && (
          <Button onClick={() => runAction("confirm")} variant="secondary">Confirm</Button>
        )}
        {booking.bookingStatus === "HOLD" && (
          <Button onClick={() => runAction("no-show")} variant="outline">Mark no-show</Button>
        )}
        {isActive && !checkedIn && (
          <Button onClick={() => setConfirm({ kind: "cancel" })} variant="danger">Cancel booking</Button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: "summary", label: "Summary" },
          { id: "guest", label: "Guest" },
          { id: "payments", label: `Payments (${booking.payments?.length ?? 0})` },
          { id: "activity", label: "Activity" },
          { id: "notes", label: "Notes" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      <div className="mt-5">
        {tab === "summary" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Stay details" />
              <CardBody>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Detail label="Check-in" value={formatDate(booking.checkInDate)} />
                  <Detail label="Check-out" value={formatDate(booking.checkOutDate)} />
                  <Detail label="Nights" value={String(booking.nights)} />
                  <Detail label="Guests" value={`${booking.adults} adults · ${booking.children} children · ${booking.infants} infants`} />
                  <Detail label="Room" value={booking.unit?.name ?? "—"} />
                  <Detail label="Source" value={booking.source.replace(/_/g, " ")} />
                  <Detail label="Actual check-in" value={formatDateTime(booking.actualCheckInAt)} />
                  <Detail label="Actual check-out" value={formatDateTime(booking.actualCheckOutAt)} />
                  <Detail label="Payment option" value={booking.paymentOption} />
                  <Detail label="Created" value={formatDateTime(booking.createdAt)} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Totals" />
              <CardBody className="space-y-2.5 text-sm">
                <Row label="Subtotal" value={lkr(booking.subtotal)} />
                <Row label="Add-ons" value={lkr(booking.addOnTotal)} />
                <Row label="Discount" value={`-${lkr(booking.discountTotal)}`} />
                <Row label="Service charge" value={lkr(booking.serviceChargeTotal)} />
                <Row label="Tax" value={lkr(booking.taxTotal)} />
                <div className="border-t border-outline-variant/40 pt-2.5 dark:border-white/10">
                  <Row label="Grand total" value={lkr(booking.grandTotal)} strong />
                  <Row label="Deposit required" value={lkr(booking.depositRequired)} />
                  <Row label="Amount paid" value={lkr(booking.amountPaid)} strong />
                  <Row label="Balance due" value={lkr(booking.balanceDue)} strong />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === "guest" && (
          <Card>
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Name" value={`${booking.guest?.firstName} ${booking.guest?.lastName}`} />
                <Detail label="Email" value={booking.guest?.email ?? "—"} />
                <Detail label="Phone" value={booking.guest?.phone ?? "—"} />
                <Detail label="Country" value={booking.guest?.country ?? "—"} />
                <Detail label="Address" value={booking.guest?.address ?? "—"} />
                <Detail label="ID reference" value={booking.guest?.identityDocumentReference ?? "—"} />
                <Detail label="Special requests" value={booking.specialRequests ?? "—"} />
              </dl>
            </CardBody>
          </Card>
        )}

        {tab === "payments" && (
          <Card>
            <CardBody>
              <DataTable columns={paymentColumns} data={booking.payments ?? []} emptyTitle="No payments recorded" emptyDescription="Record a payment from the Payments module." />
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
                      <p className="text-sm font-medium">{entry.action.replace(/_/g, " ")}</p>
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
                <EmptyState title="No activity yet" description="Audit trail entries will appear here." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "notes" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Internal notes" />
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-on-surface-variant dark:text-neutral-300">{booking.internalNotes || "No internal notes."}</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Cancellation" />
              <CardBody>
                <p className="text-sm text-on-surface-variant dark:text-neutral-300">
                  {booking.cancellationReason ? `Reason: ${booking.cancellationReason}` : booking.bookingStatus === "CANCELLED" ? "Cancelled — no reason recorded." : "Not cancelled."}
                </p>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm?.kind === "cancel"}
        onClose={() => setConfirm(null)}
        onConfirm={() => runAction("cancel", { reason: "Cancelled from owner console" })}
        title="Cancel booking"
        message="This will cancel the booking and release the dates. This action is audited."
        confirmLabel="Cancel booking"
        loading={acting}
      />
      <ConfirmDialog
        open={confirm?.kind === "checkout"}
        onClose={() => setConfirm(null)}
        onConfirm={() => runAction("check-out")}
        title="Check out guest"
        message="Mark this guest as checked out and complete the booking."
        confirmLabel="Check out"
        loading={acting}
        danger={false}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold" : "text-on-surface-variant dark:text-neutral-400"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
