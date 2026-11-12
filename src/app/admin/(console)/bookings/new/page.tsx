"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminGet, adminPost } from "@/lib/admin/api";
import type { Package } from "@/lib/admin/types";
import { lkr } from "@/lib/admin/format";
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
        title="New booking"
        description="Create a manual reservation from the front desk"
        breadcrumbs={[{ label: "Bookings", href: "/admin/bookings" }, { label: "New" }]}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/bookings")}>Cancel</Button>
            <Button type="submit" loading={creating} disabled={!canSubmit}>Create booking</Button>
          </>
        }
      />

      {loading ? (
        <EmptyState title="Loading packages…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Stay" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label="Package">
                  <Select value={pkgId} onChange={(event) => setPkgId(event.target.value)}>
                    {packages.filter((pkg) => pkg.active).map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Source">
                  <Select value={source} onChange={(event) => setSource(event.target.value)}>
                    {["ADMIN", "PHONE", "WALK_IN", "BOOKING_COM", "AIRBNB", "AGODA", "OTHER"].map((value) => (
                      <option key={value} value={value}>{value.replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Check-in date">
                  <Input type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} required />
                </Field>
                <Field label="Check-out date">
                  <Input type="date" value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} required min={checkInDate} />
                </Field>
                <Field label="Adults">
                  <Input type="number" min={1} value={adults} onChange={(event) => setAdults(event.target.value)} />
                </Field>
                <Field label="Children">
                  <Input type="number" min={0} value={children} onChange={(event) => setChildren(event.target.value)} />
                </Field>
                <Field label="Infants">
                  <Input type="number" min={0} value={infants} onChange={(event) => setInfants(event.target.value)} />
                </Field>
                <Field label="Payment option">
                  <Select value={paymentOption} onChange={(event) => setPaymentOption(event.target.value)}>
                    <option value="DEPOSIT">Deposit</option>
                    <option value="FULL">Full payment</option>
                  </Select>
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Guest details" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </Field>
                <Field label="Last name">
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                </Field>
                <Field label="Email">
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </Field>
                <Field label="Phone">
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} required />
                </Field>
                <Field label="Country" className="sm:col-span-2">
                  <Input value={country} onChange={(event) => setCountry(event.target.value)} />
                </Field>
                <Field label="Special requests" className="sm:col-span-2">
                  <Input value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} />
                </Field>
                <Field label="Internal notes" className="sm:col-span-2">
                  <Input value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
                </Field>
              </CardBody>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader title="Quote preview" />
            <CardBody>
              {quoting ? (
                <EmptyState title="Calculating…" />
              ) : quote ? (
                <div className="space-y-2.5 text-sm">
                  <Row label="Nights" value={String(quote.nights)} />
                  <Row label="Subtotal" value={lkr(quote.subtotal)} />
                  <Row label="Add-ons" value={lkr(quote.addOnTotal)} />
                  <Row label="Discount" value={`-${lkr(quote.discountTotal)}`} />
                  <Row label="Tax & service" value={lkr(Number(quote.taxTotal) + Number(quote.serviceChargeTotal))} />
                  <div className="border-t border-outline-variant/40 pt-2.5 dark:border-white/10">
                    <Row label="Grand total" value={lkr(quote.grandTotal)} strong />
                    <Row label="Deposit required" value={lkr(quote.depositRequired)} />
                  </div>
                </div>
              ) : (
                <EmptyState title="No quote available" description="Check the dates and guest counts." />
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
      <span className={strong ? "font-semibold" : "text-on-surface-variant dark:text-neutral-400"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
