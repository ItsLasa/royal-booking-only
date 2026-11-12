"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api/client";

type BookingStatusData = {
  reference: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: { adults: number; children: number; infants: number };
  totals: {
    grandTotal: number;
    depositRequired: number;
    amountPaid: number;
    balanceDue: number;
    currency: string;
  };
  expiresAt?: string;
};

export default function ManageBookingPage() {
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<BookingStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function lookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!reference.trim()) return;
    setLoading(true);
    setError("");
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(reference.trim())}/status`);
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Booking not found. Please check your reference code.");
      }
      setStatus(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retrieve booking details.");
    } finally {
      setLoading(false);
    }
  }

  async function requestCancellation(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setCancelMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(reference.trim())}/cancellation-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Failed to submit cancellation request.");
      }
      setCancelMessage("Your cancellation request has been submitted. Our reservations team will review it and contact you shortly.");
      setShowCancelModal(false);
    } catch (err) {
      setCancelMessage(err instanceof Error ? err.message : "Cancellation request failed.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-ivory px-margin-mobile pb-20 pt-36 md:px-margin-desktop font-open-sans">
        <div className="mx-auto max-w-3xl">
          <div className="bg-white p-8 shadow-sm">
            <p className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary">Guest Portal</p>
            <h1 className="mt-3 font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">Find Your Reservation</h1>
            <p className="mt-3 text-on-surface-variant">Enter your booking reference code (e.g. RMV-20260815-A7K92X) to view your stay details, payment status, or submit a change request.</p>

            <form onSubmit={lookup} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                className="flex-1 rounded border border-outline-variant p-4 text-sm font-medium focus:border-primary focus:outline-none"
                placeholder="RMV-YYYYMMDD-XXXXXX"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-primary px-8 py-4 font-label-lg text-label-lg uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Searching…" : "Search"}
              </button>
            </form>

            {error && (
              <div className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                {error}
              </div>
            )}
          </div>

          {status && (
            <div className="mt-8 rounded-lg bg-white p-8 shadow-sm">
              <div className="flex flex-col justify-between border-b border-outline-variant/30 pb-6 sm:flex-row sm:items-center">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">Reservation</span>
                  <h2 className="mt-1 font-headline-sm text-headline-sm text-primary">{status.reference}</h2>
                </div>
                <div className="mt-3 flex gap-2 sm:mt-0">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Status: {status.status}
                  </span>
                  <span className="rounded-full bg-tertiary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-tertiary">
                    Payment: {status.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant">Check-In</p>
                  <p className="mt-1 text-lg font-medium text-primary">{status.checkInDate.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant">Check-Out</p>
                  <p className="mt-1 text-lg font-medium text-primary">{status.checkOutDate.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant">Duration & Guests</p>
                  <p className="mt-1 text-lg font-medium text-primary">
                    {status.nights} Nights • {status.guests.adults} Adults
                    {status.guests.children > 0 ? `, ${status.guests.children} Children` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-md bg-surface-container-low p-6">
                <h3 className="font-title-sm text-title-sm font-semibold uppercase tracking-wider text-primary">Billing Summary</h3>
                <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>Total Amount</span>
                    <span className="font-medium text-primary">{status.totals.currency} {status.totals.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid</span>
                    <span className="font-medium text-green-700">{status.totals.currency} {status.totals.amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant/30 pt-2 font-medium text-primary">
                    <span>Balance Due</span>
                    <span>{status.totals.currency} {status.totals.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {status.paymentStatus !== "PAID" && status.status !== "CANCELLED" && (
                  <Link
                    href={`/book/payment?reference=${encodeURIComponent(status.reference)}`}
                    className="inline-block rounded bg-primary px-6 py-3 text-center text-sm font-medium uppercase tracking-wider text-white hover:opacity-90"
                  >
                    Complete Payment
                  </Link>
                )}
                {status.status !== "CANCELLED" && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="rounded border border-red-300 px-6 py-3 text-sm font-medium uppercase tracking-wider text-red-700 hover:bg-red-50"
                  >
                    Request Cancellation
                  </button>
                )}
              </div>

              {cancelMessage && (
                <div className="mt-6 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  {cancelMessage}
                </div>
              )}
            </div>
          )}

          {showCancelModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <h3 className="font-headline-sm text-headline-sm text-primary">Request Cancellation</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Please let us know the reason for cancellation. Per our villa cancellation policy, a staff manager will review and confirm your request.
                </p>
                <form onSubmit={requestCancellation} className="mt-4 space-y-4">
                  <textarea
                    rows={4}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation..."
                    className="w-full rounded border border-outline-variant p-3 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="rounded border border-outline-variant px-4 py-2 text-sm text-on-surface-variant hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={cancelling}
                      className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
                    >
                      {cancelling ? "Submitting…" : "Confirm Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
