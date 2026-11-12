"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminDelete, adminGet, adminPost } from "@/lib/admin/api";
import type { Package, SeasonalRate } from "@/lib/admin/types";
import { formatDate, lkr } from "@/lib/admin/format";
import { Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, StatusBadge } from "@/components/admin/ui";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";

export default function RatesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePkg, setActivePkg] = useState<Package | null>(null);
  const [rateModal, setRateModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [deleteRate, setDeleteRate] = useState<SeasonalRate | null>(null);
  const [acting, setActing] = useState(false);

  // rate form
  const [rateName, setRateName] = useState("");
  const [rateStart, setRateStart] = useState("");
  const [rateEnd, setRateEnd] = useState("");
  const [ratePrice, setRatePrice] = useState("");
  const [rateWeekend, setRateWeekend] = useState("");
  const [rateMinNights, setRateMinNights] = useState("");
  const [ratePriority, setRatePriority] = useState("0");

  // bulk form
  const [bulkAdjust, setBulkAdjust] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    adminGet<Package[]>("/admin/rates")
      .then((items) => {
        setPackages(items);
        setActivePkg((current) => current ?? items[0] ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function createRate(event: React.FormEvent) {
    event.preventDefault();
    if (!activePkg) return;
    setActing(true);
    try {
      await adminPost(`/admin/rates/${activePkg.id}/seasonal`, {
        name: rateName,
        startDate: rateStart,
        endDate: rateEnd,
        nightlyPrice: ratePrice,
        weekendPrice: rateWeekend || null,
        minimumNights: rateMinNights ? Number(rateMinNights) : null,
        priority: Number(ratePriority),
      });
      toast.success("Seasonal rate created");
      setRateModal(false);
      setRateName(""); setRateStart(""); setRateEnd(""); setRatePrice(""); setRateWeekend(""); setRateMinNights("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create rate");
    } finally {
      setActing(false);
    }
  }

  async function removeRate() {
    if (!deleteRate) return;
    setActing(true);
    try {
      await adminDelete(`/admin/rates/seasonal/${deleteRate.id}`);
      toast.success("Rate deleted");
      setDeleteRate(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete rate");
    } finally {
      setActing(false);
    }
  }

  async function applyBulk(event: React.FormEvent) {
    event.preventDefault();
    if (!bulkAdjust || selected.length === 0) return;
    setActing(true);
    try {
      await adminPost("/admin/rates/bulk-update", { packageIds: selected, adjustmentPercent: Number(bulkAdjust) });
      toast.success(`Updated ${selected.length} package(s)`);
      setBulkModal(false);
      setBulkAdjust("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <PageHeader title="Rates" description="Loading…" />;
  if (error) return <EmptyState title="Could not load rates" description={error} />;

  return (
    <div>
      <PageHeader
        title="Rate manager"
        description="Seasonal rates, date overrides and base prices"
        breadcrumbs={[{ label: "Rates" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkModal(true)}>Bulk update</Button>
            <Button onClick={() => setRateModal(true)}>Add seasonal rate</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Package list */}
        <Card className="h-fit">
          <CardHeader title="Packages" />
          <div className="divide-y divide-outline-variant/40 dark:divide-white/5">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setActivePkg(pkg)}
                className={cn("flex w-full items-center justify-between gap-2 px-5 py-3 text-left transition-colors", activePkg?.id === pkg.id ? "bg-[#061b0e]/5 dark:bg-white/10" : "hover:bg-surface-container/50 dark:hover:bg-white/5")}
              >
                <div>
                  <p className="text-sm font-medium">{pkg.name}</p>
                  <p className="text-xs text-on-surface-variant dark:text-neutral-400">{lkr(pkg.basePrice)}/night</p>
                </div>
                <StatusBadge status={pkg.active ? "CONFIRMED" : "CANCELLED"} label={pkg.active ? "Active" : "Inactive"} />
              </button>
            ))}
          </div>
        </Card>

        {/* Seasonal rates for selected package */}
        <Card>
          <CardHeader
            title={`${activePkg?.name ?? "Package"} — seasonal rates`}
            subtitle={activePkg ? `Base rate ${lkr(activePkg.basePrice)}/night · ${activePkg.seasonalRates?.length ?? 0} seasonal rates · ${activePkg.dateOverrides?.length ?? 0} overrides` : "Select a package"}
          />
          {activePkg?.seasonalRates?.length ? (
            <div className="divide-y divide-outline-variant/40 dark:divide-white/5">
              {activePkg.seasonalRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{rate.name}</p>
                    <p className="text-xs text-on-surface-variant dark:text-neutral-400">
                      {formatDate(rate.startDate)} → {formatDate(rate.endDate)} · {lkr(rate.nightlyPrice)}/night
                      {rate.weekendPrice ? ` · weekend ${lkr(rate.weekendPrice)}` : ""}
                      {rate.minimumNights ? ` · min ${rate.minimumNights}n` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={rate.active ? "CONFIRMED" : "CANCELLED"} label={rate.active ? `P${rate.priority}` : "Off"} />
                    <button onClick={() => setDeleteRate(rate)} className="rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error/5 dark:hover:bg-rose-500/10">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No seasonal rates" description="Add seasonal pricing to this package." />
          )}

          {activePkg?.dateOverrides?.length ? (
            <>
              <CardHeader title="Date overrides" />
              <div className="divide-y divide-outline-variant/40 dark:divide-white/5">
                {activePkg.dateOverrides.slice(0, 20).map((override) => (
                  <div key={override.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <p className="text-sm">
                      <span className="font-medium">{formatDate(override.date)}</span>
                      {override.price && <span className="ml-2 text-on-surface-variant dark:text-neutral-400">{lkr(override.price)}</span>}
                      {override.closed && <span className="ml-2 text-xs font-semibold text-error">CLOSED</span>}
                    </p>
                    <p className="text-xs text-on-surface-variant dark:text-neutral-500">{override.note ?? ""}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <Modal
        open={rateModal}
        onClose={() => setRateModal(false)}
        title="Add seasonal rate"
        footer={
          <>
            <Button variant="outline" onClick={() => setRateModal(false)}>Cancel</Button>
            <Button onClick={createRate} loading={acting}>Create rate</Button>
          </>
        }
      >
        <form onSubmit={createRate} className="space-y-4">
          <Field label="Rate name">
            <Input value={rateName} onChange={(event) => setRateName(event.target.value)} placeholder="e.g. August High Season" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date">
              <Input type="date" value={rateStart} onChange={(event) => setRateStart(event.target.value)} required />
            </Field>
            <Field label="End date">
              <Input type="date" value={rateEnd} onChange={(event) => setRateEnd(event.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nightly price (LKR)">
              <Input type="number" min={0} value={ratePrice} onChange={(event) => setRatePrice(event.target.value)} required />
            </Field>
            <Field label="Weekend price (LKR, optional)">
              <Input type="number" min={0} value={rateWeekend} onChange={(event) => setRateWeekend(event.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum nights (optional)">
              <Input type="number" min={1} value={rateMinNights} onChange={(event) => setRateMinNights(event.target.value)} />
            </Field>
            <Field label="Priority">
              <Input type="number" value={ratePriority} onChange={(event) => setRatePriority(event.target.value)} />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={bulkModal}
        onClose={() => setBulkModal(false)}
        title="Bulk update base rates"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkModal(false)}>Cancel</Button>
            <Button onClick={applyBulk} loading={acting} disabled={!bulkAdjust || selected.length === 0}>Apply</Button>
          </>
        }
      >
        <form onSubmit={applyBulk} className="space-y-4">
          <Field label="Adjustment %" hint="Positive to increase, negative to decrease">
            <Input type="number" step="1" value={bulkAdjust} onChange={(event) => setBulkAdjust(event.target.value)} placeholder="e.g. 10" />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Select packages</p>
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {packages.map((pkg) => (
                <label key={pkg.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-container/50 dark:hover:bg-white/5">
                  <input type="checkbox" checked={selected.includes(pkg.id)} onChange={(event) => setSelected((current) => (event.target.checked ? [...current, pkg.id] : current.filter((id) => id !== pkg.id)))} className="h-4 w-4 accent-[#061b0e] dark:accent-emerald-500" />
                  {pkg.name}
                  <span className="ml-auto text-xs text-on-surface-variant dark:text-neutral-500">{lkr(pkg.basePrice)}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRate)}
        onClose={() => setDeleteRate(null)}
        onConfirm={removeRate}
        title="Delete seasonal rate"
        message={`Delete "${deleteRate?.name}"? This cannot be undone.`}
        confirmLabel="Delete rate"
        loading={acting}
      />
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
