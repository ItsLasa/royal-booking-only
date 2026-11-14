"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiGet, apiPost } from "@/lib/api/client";
import { lkr } from "@/lib/bookingData";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaFilePdf,
  FaReceipt,
  FaPrint,
  FaTimes,
  FaRegCopy,
} from "react-icons/fa";

type BookingSummaryData = {
  reference: string;
  status?: string;
  checkInDate: string;
  checkOutDate: string;
  nights?: number;
  guests?: { adults: number; children: number; infants?: number };
  totals?: {
    grandTotal: number;
    depositRequired: number;
    amountPaid?: number;
    balanceDue: number;
    currency: string;
  };
  guest?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country?: string;
  };
  package?: {
    name: string;
    shortDescription?: string;
  };
  paymentOption?: string;
  specialRequests?: string;
  priceLines?: Array<{
    description: string;
    totalAmount: number;
    unitAmount?: number;
    quantity?: number;
  }>;
};

type UploadedSlip = {
  name: string;
  type: string;
  size: number;
  base64: string;
};

export function PayHerePayment({ reference }: { reference: string }) {
  const [booking, setBooking] = useState<BookingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankRefInput, setBankRefInput] = useState("");
  const [slipFile, setSlipFile] = useState<UploadedSlip | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load summary from sessionStorage (saved by the first page) and verify against live server API
  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }

    let cached: BookingSummaryData | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`booking_summary_${reference}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          cached = {
            reference: parsed.reference,
            checkInDate: parsed.checkInDate,
            checkOutDate: parsed.checkOutDate,
            nights: parsed.quote?.nights,
            guests: { adults: parsed.adults, children: parsed.children },
            totals: parsed.quote
              ? {
                  grandTotal: parsed.quote.grandTotal,
                  depositRequired: parsed.quote.depositRequired,
                  balanceDue: parsed.quote.balanceDue,
                  currency: "LKR",
                }
              : undefined,
            guest: parsed.guest,
            package: parsed.package,
            paymentOption: parsed.paymentOption,
            specialRequests: parsed.specialRequests,
            priceLines: parsed.quote?.lines,
          };
          setBooking(cached);
        }
      } catch {
        // ignore JSON parse errors
      }
    }

    // Fetch live confirmed details from API
    apiGet<BookingSummaryData>(`/bookings/${reference}/status`)
      .then((data) => {
        if (data) {
          setBooking((prev) => ({
            ...prev,
            ...data,
            guest: data.guest || prev?.guest,
            package: data.package || prev?.package,
            priceLines: data.priceLines?.length ? data.priceLines : prev?.priceLines,
            specialRequests: data.specialRequests || prev?.specialRequests,
            paymentOption: data.paymentOption || prev?.paymentOption,
            totals: data.totals || prev?.totals,
          }));
          if (data.status === "PENDING_PAYMENT" || data.status === "CONFIRMED") {
            setIsSubmitted(true);
          }
        }
      })
      .catch(() => {
        // Fallback to cached version if API fails
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reference]);

  // File handling for Image / PDF
  function handleSelectedFile(file: File | null) {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an image (JPG, PNG, WEBP) or a PDF file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSlipFile({
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
      });

      if (file.type.startsWith("image/")) {
        setSlipPreview(base64);
      } else {
        setSlipPreview(null);
      }
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  }

  function removeFile() {
    setSlipFile(null);
    setSlipPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast("Payment slip removed", { icon: "ℹ️" });
  }

  function copyBankDetail(text: string, label: string) {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      toast.success(`Copied ${label} to clipboard!`);
    }
  }

  // "Book Now" submission handler
  async function handleBookNow(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!reference) {
      toast.error("No booking reference found. Please restart your booking.");
      return;
    }

    if (!slipFile && !bankRefInput.trim()) {
      toast.error("Please upload your payment slip or enter your transaction reference number to book.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting booking & sending confirmation email...");

    try {
      const payload = {
        reference,
        bankReference: bankRefInput.trim() || (slipFile ? `Slip: ${slipFile.name}` : "Bank Transfer submitted"),
        email: booking?.guest?.email,
        slipFile: slipFile
          ? {
              base64: slipFile.base64,
              name: slipFile.name,
              type: slipFile.type,
            }
          : undefined,
      };

      await apiPost<{
        reference: string;
        status: string;
        message: string;
        slipUrl?: string;
      }>("/payments/bank-transfer", payload);

      toast.success("Your booking has been successfully submitted!", {
        id: toastId,
        duration: 6000,
      });

      setIsSubmitted(true);
      setShowSuccessModal(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit booking. Please try again.";
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl bg-white p-10 text-center shadow-sm">
        <p className="text-label-lg font-semibold uppercase tracking-widest text-tertiary">Reservation Summary</p>
        <h1 className="mt-2 text-2xl font-bold text-primary">Loading your booking details...</h1>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-4xl bg-white p-10 text-center shadow-sm">
        <p className="text-label-lg font-semibold uppercase tracking-widest text-error">Booking Not Found</p>
        <h1 className="mt-2 text-2xl font-bold text-primary">No booking details found for reference: {reference}</h1>
        <p className="mt-4 text-on-surface-variant">Please return to the reservation page and start a new booking.</p>
        <Link
          href="/book"
          className="mt-6 inline-block bg-primary px-8 py-3.5 text-label-lg font-semibold uppercase tracking-widest text-white hover:opacity-90"
        >
          Start New Booking
        </Link>
      </div>
    );
  }

  const grandTotal = booking.totals?.grandTotal ?? 0;
  const depositRequired = booking.totals?.depositRequired ?? grandTotal * 0.5;
  const balanceDue = booking.totals?.balanceDue ?? grandTotal - depositRequired;
  const isDepositOnly = booking.paymentOption === "DEPOSIT";

  return (
    <div className="mx-auto max-w-5xl font-open-sans">
      {/* Top Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-outline-variant/40 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-tertiary">Step 2 of 2</span>
          <h1 className="mt-1 text-2xl font-bold text-primary sm:text-3xl">Booking Summary & Confirmation</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Review your reservation details and complete your booking with payment verification.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant">Booking Reference</span>
          <span className="rounded bg-primary/10 px-3 py-1 font-mono text-base font-bold text-primary">
            {booking.reference}
          </span>
          <span className="mt-1 text-xs text-emerald-700 font-semibold">● Hold Active (15 Minutes)</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* Left Column: Booking Details Review */}
        <div className="space-y-6">
          {/* Guest & Reservation Card */}
          <div className="border border-outline-variant/60 bg-white p-6 shadow-sm">
            <h2 className="border-b border-outline-variant/30 pb-3 text-lg font-bold text-primary">
              1. Guest & Stay Information
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Primary Guest</span>
                <span className="font-semibold text-primary">
                  {booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : "Guest"}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Email Address</span>
                <span className="font-semibold text-primary">{booking.guest?.email ?? "Not provided"}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Phone Number</span>
                <span className="font-semibold text-primary">{booking.guest?.phone ?? "Not provided"}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Country of Residence</span>
                <span className="font-semibold text-primary">{booking.guest?.country ?? "Sri Lanka"}</span>
              </div>
            </div>

            <hr className="my-5 border-outline-variant/30" />

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Package / Villa</span>
                <span className="font-semibold text-primary">{booking.package?.name ?? "Royal Villa Package"}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Duration of Stay</span>
                <span className="font-semibold text-primary">
                  {booking.nights ? `${booking.nights} Night${booking.nights > 1 ? "s" : ""}` : "Multiple Nights"}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Check-in Date</span>
                <span className="font-semibold text-primary">
                  {booking.checkInDate} <span className="text-xs text-on-surface-variant font-normal">(from 14:00)</span>
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Check-out Date</span>
                <span className="font-semibold text-primary">
                  {booking.checkOutDate} <span className="text-xs text-on-surface-variant font-normal">(until 11:00)</span>
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Guests</span>
                <span className="font-semibold text-primary">
                  {booking.guests?.adults ?? 2} Adults
                  {booking.guests?.children ? `, ${booking.guests.children} Children` : ""}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Location</span>
                <span className="font-semibold text-primary">Pussallawa, Nuwara Eliya Road, Sri Lanka</span>
              </div>
            </div>

            {booking.specialRequests && (
              <div className="mt-4 rounded bg-surface-container-low p-3 text-xs text-on-surface">
                <span className="font-semibold uppercase tracking-wider text-on-surface-variant">Special Requests: </span>
                {booking.specialRequests}
              </div>
            )}
          </div>

          {/* Bank Instructions Card */}
          <div className="border border-outline-variant/60 bg-white p-6 shadow-sm">
            <h2 className="border-b border-outline-variant/30 pb-3 text-lg font-bold text-primary">
              2. Bank Transfer Instructions
            </h2>
            <p className="mt-2 text-xs text-on-surface-variant">
              Please transfer your {isDepositOnly ? "50% deposit" : "full payment"} amount of{" "}
              <strong className="text-primary">{lkr(isDepositOnly ? depositRequired : grandTotal)}</strong> to the official resort bank account below:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm bg-surface-container-low p-4 rounded border border-outline-variant/30">
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Bank Name</span>
                <span className="font-semibold text-primary">Commercial Bank of Ceylon</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Account Name</span>
                <span className="font-semibold text-primary">Royal Mansion Resort Villa</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-base">8012 3456 7890</span>
                  <button
                    type="button"
                    onClick={() => copyBankDetail("8012 3456 7890", "Account Number")}
                    className="text-xs text-tertiary hover:underline inline-flex items-center gap-1"
                    title="Copy Account Number"
                  >
                    <FaRegCopy /> Copy
                  </button>
                </div>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Branch</span>
                <span className="font-semibold text-primary">Pussallawa Branch</span>
              </div>
              <div className="sm:col-span-2 pt-1 border-t border-outline-variant/30">
                <span className="block text-xs uppercase tracking-wider text-on-surface-variant">Transfer Reference (Important)</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-tertiary">{booking.reference}</span>
                  <button
                    type="button"
                    onClick={() => copyBankDetail(booking.reference, "Booking Reference")}
                    className="text-xs text-tertiary hover:underline inline-flex items-center gap-1"
                  >
                    <FaRegCopy /> Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Payment Slip Upload & Book Now Button */}
        <div className="space-y-6">
          {/* Price Summary Card */}
          <div className="bg-primary p-6 text-white shadow-md">
            <h3 className="border-b border-white/20 pb-3 text-lg font-bold">Cost Breakdown</h3>

            <div className="mt-4 space-y-3 text-sm">
              {booking.priceLines && booking.priceLines.length > 0 ? (
                booking.priceLines.map((line, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="text-white/80">{line.description}</span>
                    <span className="font-medium">{lkr(line.totalAmount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between gap-2">
                  <span className="text-white/80">Accommodation & Selected Package</span>
                  <span className="font-medium">{lkr(grandTotal)}</span>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-white/20 pt-4 space-y-2 text-base">
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total</span>
                <span>{lkr(grandTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-tertiary-fixed">
                <span>{isDepositOnly ? "Deposit Due Now (50%)" : "Full Amount Due Now"}</span>
                <span>{lkr(isDepositOnly ? depositRequired : grandTotal)}</span>
              </div>
              {isDepositOnly && (
                <div className="flex justify-between text-sm text-white/70">
                  <span>Balance Due on Arrival</span>
                  <span>{lkr(balanceDue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Slip Uploader & Book Now Card */}
          <div className="border border-outline-variant/60 bg-white p-6 shadow-sm">
            <h3 className="border-b border-outline-variant/30 pb-3 text-base font-bold text-primary flex items-center gap-2">
              <FaReceipt className="text-tertiary" />
              Upload Payment Slip / Transaction Confirmation
            </h3>
            <p className="mt-2 text-xs text-on-surface-variant">
              Upload your bank deposit slip or mobile banking transfer confirmation (Image or PDF format).
            </p>

            {/* Drop / Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : slipFile
                  ? "border-emerald-500 bg-emerald-50/30"
                  : "border-outline-variant hover:border-primary hover:bg-surface-container-low"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => handleSelectedFile(e.target.files?.[0] ?? null)}
              />

              {slipFile ? (
                <div className="flex flex-col items-center">
                  {slipPreview ? (
                    <img
                      src={slipPreview}
                      alt="Payment Slip Preview"
                      className="mb-3 max-h-40 rounded border border-outline-variant/60 object-contain shadow-sm"
                    />
                  ) : (
                    <FaFilePdf className="mb-3 text-5xl text-red-600" />
                  )}
                  <span className="font-semibold text-sm text-primary max-w-xs truncate">{slipFile.name}</span>
                  <span className="text-xs text-on-surface-variant mt-0.5">
                    {(slipFile.size / 1024).toFixed(1)} KB · Ready to submit
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <FaTimes /> Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <FaCloudUploadAlt className="text-4xl text-tertiary mb-2" />
                  <span className="text-sm font-semibold text-primary">Click to upload or drag & drop</span>
                  <span className="text-xs text-on-surface-variant mt-1">
                    Image (JPG, PNG, WEBP) or PDF document (Max 10MB)
                  </span>
                </div>
              )}
            </div>

            {/* Optional Transaction Reference Number */}
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">
                Bank Transaction Reference / Slip Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-94821038 or Slip No."
                value={bankRefInput}
                onChange={(e) => setBankRefInput(e.target.value)}
                className="w-full border border-outline-variant bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            {/* "Book Now" Button */}
            <div className="mt-6 pt-4 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={handleBookNow}
                disabled={submitting || isSubmitted}
                className="w-full bg-primary px-8 py-4 text-center text-label-lg font-bold uppercase tracking-widest text-white shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting Booking..." : isSubmitted ? "Booking Submitted ✓" : "Book Now"}
              </button>
              <p className="mt-2 text-center text-xs text-on-surface-variant">
                An automatic booking summary will be emailed to{" "}
                <span className="font-semibold text-primary">{booking.guest?.email ?? "your email"}</span> upon submission.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL POPUP */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-lg bg-white p-8 shadow-2xl text-center border border-outline-variant/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <FaCheckCircle className="text-4xl" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-tertiary">Submission Confirmed</span>
            <h2 className="mt-2 text-2xl font-bold text-primary">
              Your booking has been successfully submitted!
            </h2>

            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              We have received your reservation request and uploaded payment slip for Reference{" "}
              <strong className="text-primary font-mono">{booking.reference}</strong>.
            </p>

            <div className="my-5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-left text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-emerald-900">Guest:</span>
                <span className="font-semibold text-emerald-950">
                  {booking.guest?.firstName} {booking.guest?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-900">Dates:</span>
                <span className="font-semibold text-emerald-950">
                  {booking.checkInDate} to {booking.checkOutDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-900">Payment Due / Submitted:</span>
                <span className="font-semibold text-emerald-950">
                  {lkr(isDepositOnly ? depositRequired : grandTotal)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-200/80">
                <span className="text-emerald-900">Email Confirmation:</span>
                <span className="font-semibold text-emerald-950 truncate max-w-[200px]">
                  {booking.guest?.email}
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant">
              📧 An automatic booking summary with your receipt details has been sent to your email address. Our team will verify your transfer and finalize your stay.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 border border-primary px-5 py-3 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/5"
              >
                <FaPrint /> Print Summary
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
