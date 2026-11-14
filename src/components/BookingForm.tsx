"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiGet, apiPost } from "@/lib/api/client";
import { lkr } from "@/lib/bookingData";
import Icon from "@/components/Icon";

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
  const [isChecking, setIsChecking] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

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

  const selectedAddOnIds = useCallback(() => {
    return [...selectedAddOns]
      .map((id) => {
        const addOn = uniqueAddOns.find((item) => item.id === id);
        return addOn ? { addOnId: addOn.id, quantity: 1 } : null;
      })
      .filter((entry): entry is { addOnId: string; quantity: number } => entry !== null);
  }, [selectedAddOns, uniqueAddOns]);

  const refreshQuote = useCallback(
    async (overrideOption?: string, overrideAddOns?: Set<string>) => {
      const option = overrideOption ?? form.paymentOption;
      const addOnsSet = overrideAddOns ?? selectedAddOns;

      const addOnIds = [...addOnsSet]
        .map((id) => {
          const addOn = uniqueAddOns.find((item) => item.id === id);
          return addOn ? { addOnId: addOn.id, quantity: 1 } : null;
        })
        .filter((entry): entry is { addOnId: string; quantity: number } => entry !== null);

      if (!form.packageId || !form.checkInDate || !form.checkOutDate) return;

      try {
        const data = await apiPost<Quote>("/quotes", {
          packageId: form.packageId,
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
          adults: Number(form.adults),
          children: Number(form.children),
          infants: Number(form.infants),
          addOns: addOnIds,
          paymentOption: option,
        });
        setQuote(data);
      } catch {
        // keep local state
      }
    },
    [form, selectedAddOns, uniqueAddOns]
  );

  const handlePaymentOptionChange = (newOption: string) => {
    setForm((prev) => ({ ...prev, paymentOption: newOption }));

    if (quote) {
      const isFull = newOption === "FULL";
      const newDeposit = isFull ? quote.grandTotal : Math.round(quote.grandTotal * 0.5);
      const newBalance = isFull ? 0 : quote.grandTotal - newDeposit;

      setQuote((prev) => (prev ? { ...prev, depositRequired: newDeposit, balanceDue: newBalance } : null));

      toast.success(
        isFull
          ? "Payment preference: Pay full amount (100% due now)"
          : "Payment preference: Pay 50% deposit (balance on arrival)",
        { id: "payment-pref", duration: 2500 }
      );

      refreshQuote(newOption);
    }
  };

  const toggleAddOn = useCallback(
    (id: string) => {
      const addOn = uniqueAddOns.find((item) => item.id === id);
      setSelectedAddOns((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          if (addOn) toast(`Removed extra: ${addOn.name}`, { icon: "ℹ️" });
        } else {
          next.add(id);
          if (addOn) toast.success(`Added extra: ${addOn.name}`);
        }
        if (quote) {
          refreshQuote(undefined, next);
        }
        return next;
      });
    },
    [uniqueAddOns, quote, refreshQuote]
  );

  async function requestQuote() {
    if (!form.packageId) {
      toast.error("Please select a package first.");
      return;
    }
    if (!form.checkInDate || !form.checkOutDate) {
      toast.error("Please select both check-in and check-out dates.");
      return;
    }
    if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) {
      toast.error("Check-out date must be after check-in date.");
      return;
    }

    setIsChecking(true);
    setMessage("Checking live availability and price...");
    const toastId = toast.loading("Checking live availability and rates...");

    // First verify the selected dates are still free against live bookings.
    try {
      await apiPost<{ available: boolean; remaining: number }>("/availability/search", {
        packageId: form.packageId,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
      });
    } catch (error) {
      setQuote(null);
      const errMsg = error instanceof Error && error.message ? error.message : "These dates are already booked or unavailable. Please choose different dates.";
      setMessage(errMsg);
      toast.error(errMsg, { id: toastId });
      setIsChecking(false);
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
      const successMsg = "Great news — those dates are available! Live quote..";
      setMessage(successMsg);
      toast.success(successMsg, { id: toastId });
    } catch (error) {
      setQuote(null);
      const errMsg = error instanceof Error ? error.message : "Could not load a quote. Please try again.";
      setMessage(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setIsChecking(false);
    }
  }

  async function createHold() {
    if (!form.termsAccepted) {
      toast.error("Please agree to the booking terms and cancellation policy.");
      setMessage("Please accept the booking terms before continuing.");
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in your first name, last name, email, and phone number.");
      setMessage("Please fill in all guest contact details before submitting.");
      return;
    }
    if (!form.packageId) {
      toast.error("Please select a package.");
      return;
    }

    setIsHolding(true);
    setMessage("Creating a 15 minute booking hold...");
    const holdToast = toast.loading("Securing your 15-minute booking hold...");

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
      toast.success("Reservation hold secured! Redirecting to payment...", { id: holdToast });

      if (typeof window !== "undefined") {
        const selectedPkg = packages.find((p) => p.id === form.packageId);
        try {
          sessionStorage.setItem(
            `booking_summary_${data.booking.reference}`,
            JSON.stringify({
              reference: data.booking.reference,
              package: selectedPkg ? { name: selectedPkg.name } : null,
              checkInDate: form.checkInDate,
              checkOutDate: form.checkOutDate,
              adults: form.adults,
              children: form.children,
              paymentOption: form.paymentOption,
              guest: {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
                country: form.country,
              },
              specialRequests: form.specialRequests,
              quote: quote,
            })
          );
        } catch {
          // ignore session storage quota issues
        }
      }

      window.location.href = `/book/payment?reference=${data.booking.reference}`;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Could not create booking hold. Check API and database setup.";
      setMessage(errMsg);
      toast.error(errMsg, { id: holdToast });
      setIsHolding(false);
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
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 px-margin-mobile py-12 md:px-margin-desktop lg:grid-cols-[1.2fr_0.8fr] font-open-sans">
      <div>
        <p className="mb-4 text-xl font-semibold uppercase tracking-widest text-tertiary">Direct Reservation</p>
        <h1 className="mb-4 text-headline-lg-mobile font-bold text-primary text-[42px]">Book Royal Mansion Resort Villa</h1>
        <p className="mb-8 max-w-2xl text-body-lg text-on-surface-variant">Select dates, guests, add-ons, and payment preference. Final availability and pricing are verified again on the server before payment.</p>

        {/* Step 1: Availability Search Bar & Date Picker */}
        <div className="border border-outline-variant/60 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">Step 1</span>
              <h2 className="text-xl font-bold text-primary">Check Availability & Dates</h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Location */}
            <div className="grid gap-2">
              <span className="text-primary font-medium">Location</span>
              <div className="flex items-center gap-2 border border-outline-variant bg-surface-container-low px-3 py-3 text-on-surface">
                <Icon name="location_on" className="text-tertiary text-lg shrink-0" />
                <span className="text-sm font-medium truncate">Royal Mansion, Pussallawa, Sri Lanka</span>
              </div>
            </div>

            {/* Package / Villa Option */}
            <label className="grid gap-2 text-primary font-medium">
              Package
              <select className="border border-outline-variant bg-white p-3 font-normal" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>
                {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}
              </select>
            </label>

            {/* Check-in Date */}
            <label className="grid gap-2 text-primary font-medium">
              Check-in
              <input
                className="border border-outline-variant p-3 font-normal"
                type="date"
                value={form.checkInDate}
                onChange={(e) => {
                  const newIn = e.target.value;
                  setForm((prev) => ({ ...prev, checkInDate: newIn }));
                  if (form.checkOutDate && new Date(form.checkOutDate) <= new Date(newIn)) {
                    toast.error("Check-out date should be after check-in date", { id: "date-warn" });
                  }
                }}
              />
            </label>

            {/* Check-out Date */}
            <label className="grid gap-2 text-primary font-medium">
              Check-out
              <input
                className="border border-outline-variant p-3 font-normal"
                type="date"
                value={form.checkOutDate}
                onChange={(e) => {
                  const newOut = e.target.value;
                  setForm((prev) => ({ ...prev, checkOutDate: newOut }));
                  if (form.checkInDate && new Date(newOut) <= new Date(form.checkInDate)) {
                    toast.error("Check-out date must be after check-in date", { id: "date-warn" });
                  }
                }}
              />
            </label>

            {/* Guests */}
            <label className="grid gap-2 text-primary font-medium">
              Adults
              <input className="border border-outline-variant p-3 font-normal" type="number" min="1" value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} />
            </label>
            <label className="grid gap-2 text-primary font-medium">
              Children
              <input className="border border-outline-variant p-3 font-normal" type="number" min="0" value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} />
            </label>

            {/* Check Availability Action Button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:col-span-2 pt-2">
              <button
                type="button"
                onClick={requestQuote}
                disabled={isChecking}
                className="border border-primary bg-primary px-8 py-4 text-label-lg font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isChecking ? "Checking Dates..." : "Check Availability"}
              </button>
              {quote && (
                <span className="text-sm font-semibold text-emerald-800">
                  ✓ Available for selected dates!
                </span>
              )}
            </div>

            {message && (
              <p
                className={`md:col-span-2 p-3 text-sm border ${
                  quote
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : message.includes("booked") || message.includes("unavailable") || message.includes("Could not")
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-outline-variant/60 bg-surface-container-low text-on-surface-variant"
                }`}
                role="status"
              >
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Guest Details & Final Hold */}
        <div className="mt-8 border border-outline-variant/60 bg-white p-6 shadow-sm">
          <div className="mb-4 border-b border-outline-variant/30 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">Step 2</span>
            <h2 className="text-xl font-bold text-primary">Guest Information & Reservation</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-primary font-medium">First name<input className="border border-outline-variant p-3 font-normal" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
            <label className="grid gap-2 text-primary font-medium">Last name<input className="border border-outline-variant p-3 font-normal" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
            <label className="grid gap-2 text-primary font-medium">Email<input className="border border-outline-variant p-3 font-normal" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="grid gap-2 text-primary font-medium">Phone<input className="border border-outline-variant p-3 font-normal" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="grid gap-2 text-primary font-medium md:col-span-2">
              Payment preference
              <select
                className="border border-outline-variant p-3 font-normal bg-white"
                value={form.paymentOption}
                onChange={(e) => handlePaymentOptionChange(e.target.value)}
              >
                <option value="DEPOSIT">Pay 50% deposit</option>
                <option value="FULL">Pay full amount</option>
              </select>
            </label>
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
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={createHold}
                disabled={isHolding}
                className="w-full bg-primary px-6 py-4 text-label-lg font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isHolding ? "Creating Hold..." : "Create Hold and Pay"}
              </button>
            </div>
          </div>
        </div>
      </div>


      <aside className="lg:sticky lg:top-28 lg:self-start h-fit w-full">
        <div className="bg-primary p-8 text-white shadow-lg">
          <h2 className="mb-6 text-headline-sm font-semibold">Review</h2>
          {quote ? (
            <>
              <div className="space-y-4 border-y border-white/20 py-5">{quote.lines.map((line) => <div key={line.description} className="flex justify-between gap-4"><span>{line.description}</span><span>{lkr(line.totalAmount)}</span></div>)}</div>
              <div className="mt-6 space-y-3 text-lg">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>{lkr(quote.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-tertiary-fixed font-semibold">
                  <span>{form.paymentOption === "FULL" ? "Due now (Full Payment)" : "Due now (50% Deposit)"}</span>
                  <span>{lkr(quote.depositRequired)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Balance later</span>
                  <span>{quote.balanceDue === 0 ? "LKR 0 (Fully Paid)" : lkr(quote.balanceDue)}</span>
                </div>
              </div>
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
