"use client";

import { useState } from "react";
import { lkr, getSlipFullUrl } from "@/lib/admin/format";
import { Button } from "./ui";

export interface BankSlipModalProps {
  open: boolean;
  onClose: () => void;
  slipUrl?: string | null;
  bookingReference?: string;
  guestName?: string;
  amount?: string | number;
  bankReference?: string | null;
  verified?: boolean;
  onVerify?: () => void;
  verifying?: boolean;
}

export function BankSlipModal({
  open,
  onClose,
  slipUrl,
  bookingReference,
  guestName,
  amount,
  bankReference,
  verified,
  onVerify,
  verifying,
}: BankSlipModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgError, setImgError] = useState(false);

  if (!open) return null;

  const fullUrl = getSlipFullUrl(slipUrl);
  const isPdf = Boolean(slipUrl && slipUrl.toLowerCase().endsWith(".pdf"));

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col max-h-[92vh] rounded-2xl border border-outline-variant/60 bg-white shadow-2xl dark:border-white/10 dark:bg-[#12171c] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              📄
            </span>
            <div>
              <h3 className="text-base font-semibold text-on-surface dark:text-white">
                Bank Transfer Payment Slip
              </h3>
              <p className="text-xs text-on-surface-variant dark:text-neutral-400">
                {bookingReference ? `Reservation Ref: ${bookingReference}` : "Payment Proof Document"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Info Strip */}
        <div className="grid grid-cols-2 gap-3 border-b border-outline-variant/30 bg-surface-container-lowest/60 px-6 py-3 sm:grid-cols-4 dark:border-white/5 dark:bg-white/[0.02] text-xs">
          {guestName && (
            <div>
              <span className="text-on-surface-variant dark:text-neutral-400">Guest:</span>
              <p className="font-medium text-on-surface dark:text-white truncate">{guestName}</p>
            </div>
          )}
          {amount && (
            <div>
              <span className="text-on-surface-variant dark:text-neutral-400">Amount:</span>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">{lkr(amount)}</p>
            </div>
          )}
          <div>
            <span className="text-on-surface-variant dark:text-neutral-400">Bank / Tx Ref:</span>
            <p className="font-medium text-on-surface dark:text-white truncate">
              {bankReference || "Not specified"}
            </p>
          </div>
          <div>
            <span className="text-on-surface-variant dark:text-neutral-400">Verification:</span>
            <p className="font-medium">
              {verified ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  ⏳ Pending Verification
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Image Controls toolbar (for images) */}
        {!isPdf && slipUrl && !imgError && (
          <div className="flex items-center justify-between border-b border-outline-variant/30 bg-neutral-50 px-6 py-2 text-xs dark:border-white/5 dark:bg-[#181f26]">
            <span className="text-on-surface-variant dark:text-neutral-400">
              Zoom: {Math.round(zoom * 100)}%
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="rounded border border-outline-variant/40 bg-white px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Zoom Out"
              >
                − Zoom Out
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded border border-outline-variant/40 bg-white px-2 py-1 text-xs hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Reset Zoom"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="rounded border border-outline-variant/40 bg-white px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Zoom In"
              >
                + Zoom In
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="ml-2 rounded border border-outline-variant/40 bg-white px-2 py-1 text-xs hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Rotate 90 Degrees"
              >
                ↻ Rotate
              </button>
            </div>
          </div>
        )}

        {/* Preview Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto bg-neutral-900/5 p-4 dark:bg-black/40 min-h-[360px] max-h-[62vh]">
          {!slipUrl ? (
            <div className="text-center p-8 text-sm text-neutral-500">
              <span className="text-3xl block mb-2">📄</span>
              <p>No bank slip file recorded for this payment.</p>
              {bankReference && (
                <p className="mt-1 text-xs text-neutral-400">
                  Guest reference note: &ldquo;{bankReference}&rdquo;
                </p>
              )}
            </div>
          ) : isPdf ? (
            <div className="w-full h-full min-h-[460px] flex flex-col">
              <iframe
                src={fullUrl}
                title="Bank Slip PDF"
                className="w-full flex-1 rounded-lg border border-outline-variant/40 dark:border-white/10 bg-white"
              />
              <div className="mt-2 text-center text-xs text-neutral-500">
                PDF not rendering?{" "}
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary-hover font-medium"
                >
                  Click here to download / open in new tab
                </a>
              </div>
            </div>
          ) : imgError ? (
            <div className="text-center p-8 text-sm text-red-500">
              <span className="text-3xl block mb-2">⚠️</span>
              <p>Failed to load image preview from:</p>
              <code className="text-xs text-neutral-400 block mt-1 break-all">{fullUrl}</code>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded bg-primary px-3 py-1.5 text-xs text-white"
              >
                Try Direct Download
              </a>
            </div>
          ) : (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullUrl}
                alt="Bank Transfer Payment Slip"
                onError={() => setImgError(true)}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                  maxWidth: "100%",
                  maxHeight: "58vh",
                  objectFit: "contain",
                }}
                className="rounded-lg shadow-md cursor-grab active:cursor-grabbing select-none"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 bg-surface px-6 py-4 dark:border-white/10 dark:bg-[#12171c]">
          <div className="flex items-center gap-2">
            {slipUrl && (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/60 bg-white px-3 py-2 text-xs font-medium text-on-surface hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10 transition-colors"
              >
                ↗ Open Original / Download
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {!verified && onVerify && (
              <Button
                variant="primary"
                onClick={onVerify}
                loading={verifying}
              >
                ✓ Verify Payment Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
