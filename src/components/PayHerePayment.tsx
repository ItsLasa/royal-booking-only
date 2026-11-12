"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";

type PayHereFields = Record<string, string>;

type PayHereCheckout = { actionUrl: string; fields: PayHereFields };

export function PayHerePayment({ reference }: { reference: string }) {
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  async function startPayHere() {
    if (!reference) {
      setMessage("No booking reference found. Please start a new booking.");
      return;
    }
    setProcessing(true);
    setMessage("Preparing PayHere checkout...");
    let checkout: PayHereCheckout;
    try {
      const res = await fetch(`${API_BASE_URL}/payments/payhere/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? "Payment could not be started.");
      checkout = json.data as PayHereCheckout;
    } catch (error) {
      setProcessing(false);
      setMessage(error instanceof Error ? error.message : "Payment could not be started.");
      return;
    }

    // Auto-submit a hidden form to PayHere hosted checkout (sandbox or live).
    const form = document.createElement("form");
    form.method = "POST";
    form.action = checkout.actionUrl;
    form.style.display = "none";
    for (const [key, value] of Object.entries(checkout.fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    setMessage("Opening PayHere secure checkout...");
    form.submit();
  }

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankRefInput, setBankRefInput] = useState("");
  const [submittingBank, setSubmittingBank] = useState(false);

  async function submitBankTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!bankRefInput.trim()) {
      setMessage("Please enter your bank transfer reference or transaction number.");
      return;
    }
    setSubmittingBank(true);
    setMessage("Submitting bank transfer reference...");
    try {
      const res = await fetch(`${API_BASE_URL}/payments/bank-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, bankReference: bankRefInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Could not submit bank reference.");
      }
      setMessage("Your bank transfer reference has been submitted. Our team will verify the payment and confirm your reservation shortly.");
      setShowBankForm(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to submit bank reference.");
    } finally {
      setSubmittingBank(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 shadow-sm font-open-sans">
      <p className="text-label-lg font-semibold uppercase tracking-widest text-tertiary">Payment</p>
      <h1 className="mt-3 text-headline-lg-mobile font-bold text-primary md:text-headline-lg">Complete booking {reference}</h1>
      <p className="mt-4 text-on-surface-variant">Press “Pay with PayHere” to open the secure PayHere checkout. Your booking is only confirmed after PayHere confirms the payment to our server.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button onClick={startPayHere} disabled={processing} className="bg-primary px-6 py-4 text-label-lg font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {processing ? "Opening checkout…" : "Pay with PayHere"}
        </button>
        <button
          onClick={() => setShowBankForm((v) => !v)}
          className="border border-primary px-6 py-4 text-label-lg font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/5"
        >
          {showBankForm ? "Cancel Bank Transfer" : "Bank Transfer"}
        </button>
      </div>

      {showBankForm && (
        <form onSubmit={submitBankTransfer} className="mt-6 rounded-lg border border-outline-variant/40 bg-surface-container-low p-6">
          <h3 className="font-title-md text-title-md text-primary font-medium">Bank Transfer Instructions</h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            Please transfer the deposit to our official bank account and provide the deposit slip / transaction reference number below for verification:
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="e.g. TXN-9842104 or Slip No."
              value={bankRefInput}
              onChange={(e) => setBankRefInput(e.target.value)}
              className="flex-1 rounded border border-outline-variant bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={submittingBank}
              className="bg-primary px-6 py-3 text-sm font-medium uppercase tracking-wider text-white disabled:opacity-60"
            >
              {submittingBank ? "Submitting…" : "Confirm Reference"}
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className="mt-6 rounded border border-outline-variant/30 bg-surface-container-low p-4 text-sm text-primary" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
