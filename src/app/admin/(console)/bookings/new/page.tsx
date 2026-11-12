"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminGet, adminPost } from "@/lib/admin/api";
import type { Package } from "@/lib/admin/types";
import { lkr, BOOKING_SOURCE_LABELS } from "@/lib/admin/format";
import { Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select } from "@/components/admin/ui";

type Quote = { nights: number; grandTotal: number; depositRequired: number; subtotal: number; addOnTotal: number; discountTotal: number; taxTotal: number; serviceChargeTotal: number; lines: { type: string; description: string; totalAmount: number }[] };

export default function NewBookingPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgId, setPkgId] = useState("");
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkOutDate, setCheckOutDate] = useState("");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [infants, setInfants] = useState("0");
  const [paymentOption, setPaymentOption] = useState("DEPOSIT");
  const [source, setSource] = useState("ADMIN");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    adminGet<Package[]>("/admin/packages")
      .then((items) => {
        setPackages(items);
        setPkgId(items[0]?.id ?? "");
        const start = new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + 2);
        setCheckOutDate(end.toISOString().slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!pkgId || !checkInDate || !checkOutDate) return;
    setQuoting(true);
    adminPost<Quote>("/quotes", { packageId: pkgId, checkInDate, checkOutDate, adults: Number(adults), children: Number(children), infants: Number(infants), paymentOption })
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setQuoting(false));
  }, [pkgId, checkInDate, checkOutDate, adults, children, infants, paymentOption]);

  const canSubmit = useMemo(() => pkgId && checkInDate && checkOutDate && firstName && lastName && email && phone, [pkgId, checkInDate, checkOutDate, firstName, lastName, email, phone]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setCreating(true);
    try {
      const booking = await adminPost<{ id: string }>("/admin/bookings", {
        packageId: pkgId,
        checkInDate,
        checkOutDate,
        adults: Number(adults),
        children: Number(children),
        infants: Number(infants),
        paymentOption,
        source,
        guest: { firstName, lastName, email, phone, country: country || undefined },
        specialRequests: specialRequests || undefined,
        internalNotes: internalNotes || undefined,
      });
      toast.success("Booking created");
      router.push(`/admin/bookings/${booking.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create booking");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title="Create New Reservation"
        description="Book a direct reservation for front desk walk-ins, phone reservations, or VIP guests"
        breadcrumbs={[{ label: "Reservations", href: "/admin/bookings" }, { label: "New Reservation" }]}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/bookings")}>Cancel</Button>
            <Button type="submit" loading={creating} disabled={!canSubmit}>Confirm & Create Reservation</Button>
          </>
        }
      />

      {loading ? (
        <EmptyState title="Loading available packages…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Stay & Accommodation Details" subtitle="Select stay package, arrival dates, and party size" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label="Stay Package">
                  <Select value={pkgId} onChange={(event) => setPkgId(event.target.value)}>
                    {packages.filter((pkg) => pkg.active).map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Booking Channel / Source">
                  <Select value={source} onChange={(event) => setSource(event.target.value)}>
                    {["ADMIN", "PHONE", "WALK_IN", "BOOKING_COM", "AIRBNB", "AGODA", "OTHER"].map((value) => (
                      <option key={value} value={value}>{BOOKING_SOURCE_LABELS[value] ?? value.replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Check-in Date">
                  <Input type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} required />
                </Field>
                <Field label="Check-out Date">
                  <Input type="date" value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} required min={checkInDate} />
                </Field>
                <Field label="Adult Guests">
                  <Input type="number" min={1} value={adults} onChange={(event) => setAdults(event.target.value)} />
                </Field>
                <Field label="Child Guests (Age 3-12)">
                  <Input type="number" min={0} value={children} onChange={(event) => setChildren(event.target.value)} />
                </Field>
                <Field label="Infant Guests (Under 3)">
                  <Input type="number" min={0} value={infants} onChange={(event) => setInfants(event.target.value)} />
                </Field>
                <Field label="Payment Term Option">
                  <Select value={paymentOption} onChange={(event) => setPaymentOption(event.target.value)}>
                    <option value="DEPOSIT">Require Initial Deposit Only</option>
                    <option value="FULL">Require Full Payment Upfront</option>
                  </Select>
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Guest Contact Information" subtitle="Primary guest contact and private staff notes" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name">
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="e.g. John" required />
                </Field>
                <Field label="Last Name">
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="e.g. Silva" required />
                </Field>
                <Field label="Email Address">
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="guest@example.com" required />
                </Field>
                <Field label="Phone Number">
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+94 77 123 4567" required />
                </Field>
                <Field label="Country / Region of Residence" className="sm:col-span-2">
                  <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="e.g. Sri Lanka, United Kingdom, Australia" />
                </Field>
                <Field label="Special Requests / Dietary Requirements" className="sm:col-span-2">
                  <Input value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} placeholder="e.g. Late arrival around 9 PM, vegetarian breakfast" />
                </Field>
                <Field label="Private Staff Notes (Internal only)" className="sm:col-span-2">
                  <Input value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="e.g. VIP guest, referred by management" />
                </Field>
              </CardBody>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader title="Live Quote Summary" subtitle="Calculated based on chosen package & dates" />
            <CardBody>
              {quoting ? (
                <EmptyState title="Calculating quote…" />
              ) : quote ? (
                <div className="space-y-2.5 text-sm">
                  <Row label="Total Stay Duration" value={`${quote.nights} night${quote.nights === 1 ? "" : "s"}`} />
                  <Row label="Base Accommodation" value={lkr(quote.subtotal)} />
                  <Row label="Available Extras" value={lkr(quote.addOnTotal)} />
                  <Row label="Promotional Discount" value={`-${lkr(quote.discountTotal)}`} />
                  <Row label="Taxes & Surcharges" value={lkr(Number(quote.taxTotal) + Number(quote.serviceChargeTotal))} />
                  <div className="border-t border-outline-variant/40 pt-2.5 dark:border-white/10">
                    <Row label="Estimated Grand Total" value={lkr(quote.grandTotal)} strong />
                    <Row label="Initial Deposit Required" value={lkr(quote.depositRequired)} />
                  </div>
                </div>
              ) : (
                <EmptyState title="Quote unavailable" description="Please verify your dates and guest capacity." />
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </form>
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
