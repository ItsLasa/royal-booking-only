"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { lkr } from "@/lib/bookingData";

type PublicPackage = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  basePrice?: string | number;
};

type PublicAddOn = {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  pricingType: string;
  maximumQuantity: number;
};

type Quote = {
  grandTotal: number;
  depositRequired: number;
  balanceDue: number;
  nights: number;
  lines: Array<{ description: string; totalAmount: number }>;
};

type LoadState = "loading" | "ready" | "empty" | "error";

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const defaultRange = () => {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);
  return { checkInDate: toDateInput(checkIn), checkOutDate: toDateInput(checkOut) };
};

export function BookingForm() {
  const [packages, setPackages] = useState<PublicPackage[]>([]);
  const [addOns, setAddOns] = useState<PublicAddOn[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadMessage, setLoadMessage] = useState("");
  const [form, setForm] = useState({
    packageId: "",
    checkInDate: "",
    checkOutDate: "",
    adults: 2,
    children: 0,
    infants: 0,
    paymentOption: "DEPOSIT",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "Sri Lanka",
    specialRequests: "",
    termsAccepted: false,
  });
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoadState("loading");
    const range = defaultRange();
    setForm((prev) => ({
      ...prev,
      checkInDate: prev.checkInDate || range.checkInDate,
      checkOutDate: prev.checkOutDate || range.checkOutDate,
    }));
    try {
      const [pkgs, extras] = await Promise.all([
        apiGet<PublicPackage[]>("/public/packages"),
        apiGet<PublicAddOn[]>("/public/add-ons"),
      ]);
      if (!pkgs || pkgs.length === 0) {
        setLoadState("empty");
        setLoadMessage("No packages have been published yet. Please check back soon or contact the resort directly.");
        return;
      }
      setPackages(pkgs);
      setAddOns(extras ?? []);
      const slug = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("package") : null;
      const initial = slug ? pkgs.find((pkg) => pkg.slug === slug) : undefined;
      setForm((prev) => ({ ...prev, packageId: (initial ?? pkgs[0]).id }));
      setLoadState("ready");
    } catch {
      setLoadState("error");
      setLoadMessage("Could not reach the booking service. Please make sure the API and database are running, then try again.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueAddOns = useMemo(() => {
    const seen = new Set<string>();
    return addOns.filter((addOn) => {
      if (seen.has(addOn.name)) return false;
      seen.add(addOn.name);
      return true;
    });
  }, [addOns]);

  const toggleAddOn = useCallback((id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedAddOnIds = useCallback(() => {
    return [...selectedAddOns]
      .map((id) => {
        const addOn = uniqueAddOns.find((item) => item.id === id);
        return addOn ? { addOnId: addOn.id, quantity: 1 } : null;
      })
      .filter((entry): entry is { addOnId: string; quantity: number } => entry !== null);
  }, [selectedAddOns, uniqueAddOns]);

  async function requestQuote() {
    if (!form.packageId) return;
    setMessage("Checking live availability and price...");
    // First verify the selected dates are still free against live bookings.
    try {
      await apiPost<{ available: boolean; remaining: number }>("/availability/search", {
        packageId: form.packageId,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
      });
    } catch (error) {
      setQuote(null);
      setMessage(error instanceof Error && error.message ? error.message : "These dates are already booked or unavailable. Please choose different dates.");
      return;
    }
    try {
      const data = await apiPost<Quote>("/quotes", {
        packageId: form.packageId,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        adults: Number(form.adults),
        children: Number(form.children),
        infants: Number(form.infants),
        addOns: selectedAddOnIds(),
        paymentOption: form.paymentOption,
      });
      setQuote(data);
      setMessage("Great news — those dates are available. Live quote loaded from the booking service.");
    } catch (error) {
      setQuote(null);
      setMessage(error instanceof Error ? error.message : "Could not load a quote. Please try again.");
    }
  }

  async function createHold() {
    if (!form.termsAccepted) {
      setMessage("Please accept the booking terms before continuing.");
      return;
    }
    if (!form.packageId) return;
    setMessage("Creating a 15 minute booking hold...");
    try {
      const data = await apiPost<{ booking: { reference: string } }>("/bookings/hold", {
        packageId: form.packageId,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        adults: Number(form.adults),
        children: Number(form.children),
        infants: Number(form.infants),
        addOns: selectedAddOnIds(),
        paymentOption: form.paymentOption,
        guest: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          country: form.country,
        },
        specialRequests: form.specialRequests,
        termsAccepted: form.termsAccepted,
      });
      window.location.href = `/book/payment?reference=${data.booking.reference}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create booking hold. Check API and database setup.");
    }
  }

  if (loadState !== "ready") {
    return (
      <section className="mx-auto max-w-7xl px-margin-mobile py-20 md:px-margin-desktop font-open-sans">
        <div className="bg-white p-10 text-center shadow-sm">
          <p className="text-label-lg font-semibold uppercase tracking-widest text-tertiary">Direct Reservation</p>
          <h1 className="mt-3 text-headline-lg-mobile font-bold text-primary md:text-headline-lg">Book Royal Mansion Resort Villa</h1>
          
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant" role="status">
            {loadState === "loading" ? "Loading available packages..." : loadMessage}
          </p>
          {loadState !== "loading" && (
            <button onClick={load} className="mt-6 border border-primary px-6 py-3 text-label-lg font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white">
              Try again
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-margin-mobile py-12 md:px-margin-desktop lg:grid-cols-[1.2fr_0.8fr] font-open-sans">
      <div>
        <p className="mb-4 text-xl font-semibold uppercase tracking-widest text-tertiary">Direct Reservation</p>
        <h1 className="mb-4 text-headline-lg-mobile font-bold text-primary text-[42px]">Book Royal Mansion Resort Villa</h1>
        <p className="mb-8 max-w-2xl text-body-lg text-on-surface-variant">Select dates, guests, add-ons, and payment preference. Final availability and pricing are verified again on the server before payment.</p>
        <div className="grid gap-5 bg-white p-6 shadow-sm md:grid-cols-2">
          <label className="grid gap-2 text-primary font-medium">Package<select className="border border-outline-variant p-3 font-normal" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>{packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></label>
          <label className="grid gap-2 text-primary font-medium">Payment<select className="border border-outline-variant p-3 font-normal" value={form.paymentOption} onChange={(e) => setForm({ ...form, paymentOption: e.target.value })}><option value="DEPOSIT">Pay 50% deposit</option><option value="FULL">Pay full amount</option></select></label>
          <label className="grid gap-2 text-primary font-medium">Check-in<input className="border border-outline-variant p-3 font-normal" type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} /></label>
          <label className="grid gap-2 text-primary font-medium">Check-out<input className="border border-outline-variant p-3 font-normal" type="date" value={form.checkOutDate} onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} /></label>
          <label className="grid gap-2 text-primary font-medium">Adults<input className="border border-outline-variant p-3 font-normal" type="number" min="1" value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} /></label>
          <label className="grid gap-2 text-primary font-medium">Children<input className="border border-outline-variant p-3 font-normal" type="number" min="0" value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} /></label>
          <label className="grid gap-2 text-primary font-medium">First name<input className="border border-outline-variant p-3 font-normal" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
          <label className="grid gap-2 text-primary font-medium">Last name<input className="border border-outline-variant p-3 font-normal" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
          <label className="grid gap-2 text-primary font-medium">Email<input className="border border-outline-variant p-3 font-normal" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="grid gap-2 text-primary font-medium">Phone<input className="border border-outline-variant p-3 font-normal" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="grid gap-2 text-primary font-medium md:col-span-2">Special requests<textarea className="min-h-28 border border-outline-variant p-3 font-normal" value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} /></label>
          {uniqueAddOns.length > 0 && (
            <div className="md:col-span-2">
              <p className="mb-3 text-label-lg font-semibold uppercase tracking-widest text-primary">Available extras</p>
              <div className="grid gap-2 sm:grid-cols-2">{uniqueAddOns.map((item) => (
                <label key={item.id} className="flex items-center gap-3 border border-outline-variant p-3 cursor-pointer">
                  <input type="checkbox" checked={selectedAddOns.has(item.id)} onChange={() => toggleAddOn(item.id)} />
                  <span className="flex-1">{item.name}</span>
                  <span className="text-on-surface-variant font-medium">{lkr(Number(item.price))}</span>
                </label>
              ))}</div>
            </div>
          )}
          <label className="flex items-start gap-3 md:col-span-2 cursor-pointer"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} />I agree to the booking terms, cancellation policy.</label>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
            <button onClick={requestQuote} className="border border-primary px-6 py-4 text-label-lg font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/5">Check Availability</button>
            <button onClick={createHold} className="bg-primary px-6 py-4 text-label-lg font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90">Create Hold and Pay</button>
          </div>
          {message && <p className="md:col-span-2 text-on-surface-variant" role="status">{message}</p>}
        </div>
      </div>


      <aside className="lg:sticky lg:top-28">
        <div className="bg-primary p-8 text-white">
          <h2 className="mb-6 text-headline-sm font-semibold">Review</h2>
          {quote ? (
            <>
              <div className="space-y-4 border-y border-white/20 py-5">{quote.lines.map((line) => <div key={line.description} className="flex justify-between gap-4"><span>{line.description}</span><span>{lkr(line.totalAmount)}</span></div>)}</div>
              <div className="mt-6 space-y-3 text-lg"><div className="flex justify-between"><span>Total</span><span>{lkr(quote.grandTotal)}</span></div><div className="flex justify-between"><span>Due now</span><span>{lkr(quote.depositRequired)}</span></div><div className="flex justify-between text-white/70"><span>Balance later</span><span>{lkr(quote.balanceDue)}</span></div></div>
            </>
          ) : (
            <p className="border-y border-white/20 py-5 text-sm text-white/80">Select your package, dates, and guests, then press “Check Availability” to see a live quote.</p>
          )}
          <p className="mt-6 text-sm text-white/70">A booking hold expires after 15 minutes unless PayHere confirms payment or an admin confirms bank transfer.</p>
        </div>
      </aside>
    </section>
  );
}
