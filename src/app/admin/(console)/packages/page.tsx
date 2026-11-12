"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminGet, adminPatch, adminPost } from "@/lib/admin/api";
import type { Package } from "@/lib/admin/types";
import { lkr } from "@/lib/admin/format";
import { Button, Card, CardBody, EmptyState, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Modal";

type PackageForm = {
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  basePrice: string;
  pricingType: string;
  includedAdults: string;
  maximumGuests: string;
  minimumNights: string;
  maximumNights: string;
  depositPercentage: string;
  mealPlan: string;
  cancellationPolicy: string;
  terms: string;
  featured: boolean;
  active: boolean;
  displayOrder: string;
};

const EMPTY: PackageForm = {
  name: "", slug: "", shortDescription: "", fullDescription: "", basePrice: "", pricingType: "PER_NIGHT", includedAdults: "2", maximumGuests: "10", minimumNights: "1", maximumNights: "30",
  depositPercentage: "50", mealPlan: "", cancellationPolicy: "", terms: "", featured: false, active: true, displayOrder: "0",
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState<PackageForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminGet<Package[]>("/admin/packages")
      .then(setPackages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setDrawerOpen(true);
  }

  function openEdit(pkg: Package) {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      slug: pkg.slug,
      shortDescription: pkg.shortDescription,
      fullDescription: pkg.fullDescription ?? "",
      basePrice: String(Number(pkg.basePrice)),
      pricingType: pkg.pricingType,
      includedAdults: String(pkg.includedAdults),
      maximumGuests: String(pkg.maximumGuests),
      minimumNights: String(pkg.minimumNights),
      maximumNights: String(pkg.maximumNights),
      depositPercentage: String(Number(pkg.depositPercentage)),
      mealPlan: pkg.mealPlan ?? "",
      cancellationPolicy: pkg.cancellationPolicy ?? "",
      terms: pkg.terms ?? "",
      featured: pkg.featured,
      active: pkg.active,
      displayOrder: String(pkg.displayOrder),
    });
    setDrawerOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        basePrice: Number(form.basePrice),
        includedAdults: Number(form.includedAdults),
        maximumGuests: Number(form.maximumGuests),
        minimumNights: Number(form.minimumNights),
        maximumNights: Number(form.maximumNights),
        depositPercentage: Number(form.depositPercentage),
        displayOrder: Number(form.displayOrder),
      };
      if (editing) {
        await adminPatch(`/admin/packages/${editing.id}`, body);
        toast.success("Package updated");
      } else {
        await adminPost("/admin/packages", body);
        toast.success("Package created");
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save package");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pkg: Package) {
    try {
      if (pkg.active) {
        await adminPost(`/admin/packages/${pkg.id}/deactivate`);
        toast.success("Package deactivated");
      } else {
        await adminPatch(`/admin/packages/${pkg.id}`, { active: true });
        toast.success("Package activated");
      }
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (loading) return <PageHeader title="Packages" description="Loading…" />;
  if (error) return <EmptyState title="Could not load packages" description={error} />;

  return (
    <div>
      <PageHeader
        title="Packages"
        description="Stay packages, pricing and availability"
        breadcrumbs={[{ label: "Packages" }]}
        actions={<Button onClick={openCreate}>New package</Button>}
      />

      {packages.length === 0 ? (
        <Card>
          <EmptyState title="No packages yet" action={<Button onClick={openCreate}>Create first package</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} hover className="flex flex-col">
              <CardBody className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{pkg.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant dark:text-neutral-400">{pkg.shortDescription}</p>
                  </div>
                  <StatusBadge status={pkg.active ? "CONFIRMED" : "CANCELLED"} label={pkg.active ? "Active" : "Inactive"} />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{lkr(pkg.basePrice)}</p>
                    <p className="text-xs text-on-surface-variant dark:text-neutral-400">{pkg.pricingType === "PER_NIGHT" ? "per night" : "per booking"}</p>
                  </div>
                  {pkg.featured && <StatusBadge status="URGENT" label="Featured" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-surface-container px-2 py-0.5 dark:bg-white/10">{pkg.minimumNights}–{pkg.maximumNights} nights</span>
                  <span className="rounded-full bg-surface-container px-2 py-0.5 dark:bg-white/10">Up to {pkg.maximumGuests} guests</span>
                  <span className="rounded-full bg-surface-container px-2 py-0.5 dark:bg-white/10">{Number(pkg.depositPercentage)}% deposit</span>
                  {pkg.mealPlan && <span className="rounded-full bg-surface-container px-2 py-0.5 dark:bg-white/10">{pkg.mealPlan}</span>}
                </div>
                <div className="mt-5 flex gap-2 border-t border-outline-variant/40 pt-4 dark:border-white/10">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(pkg)}>Edit</Button>
                  <Button size="sm" variant={pkg.active ? "ghost" : "outline"} className="flex-1" onClick={() => toggleActive(pkg)}>
                    {pkg.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New package"}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? "Save changes" : "Create package"}</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </Field>
          <Field label="Slug" hint="Lowercase letters, numbers and hyphens">
            <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} pattern="[a-z0-9-]+" required />
          </Field>
          <Field label="Short description">
            <Input value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} required />
          </Field>
          <Field label="Full description">
            <Textarea value={form.fullDescription} onChange={(event) => setForm({ ...form, fullDescription: event.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Base price (LKR)">
              <Input type="number" min={0} value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} required />
            </Field>
            <Field label="Pricing type">
              <Select value={form.pricingType} onChange={(event) => setForm({ ...form, pricingType: event.target.value })}>
                <option value="PER_NIGHT">Per night</option>
                <option value="PER_BOOKING">Per booking</option>
              </Select>
            </Field>
            <Field label="Included adults">
              <Input type="number" min={0} value={form.includedAdults} onChange={(event) => setForm({ ...form, includedAdults: event.target.value })} />
            </Field>
            <Field label="Maximum guests">
              <Input type="number" min={1} value={form.maximumGuests} onChange={(event) => setForm({ ...form, maximumGuests: event.target.value })} />
            </Field>
            <Field label="Minimum nights">
              <Input type="number" min={1} value={form.minimumNights} onChange={(event) => setForm({ ...form, minimumNights: event.target.value })} />
            </Field>
            <Field label="Maximum nights">
              <Input type="number" min={1} value={form.maximumNights} onChange={(event) => setForm({ ...form, maximumNights: event.target.value })} />
            </Field>
            <Field label="Deposit %">
              <Input type="number" min={0} max={100} value={form.depositPercentage} onChange={(event) => setForm({ ...form, depositPercentage: event.target.value })} />
            </Field>
            <Field label="Display order">
              <Input type="number" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: event.target.value })} />
            </Field>
          </div>
          <Field label="Meal plan">
            <Input value={form.mealPlan} onChange={(event) => setForm({ ...form, mealPlan: event.target.value })} placeholder="e.g. Breakfast included" />
          </Field>
          <Field label="Cancellation policy">
            <Textarea value={form.cancellationPolicy} onChange={(event) => setForm({ ...form, cancellationPolicy: event.target.value })} />
          </Field>
          <Field label="Terms">
            <Textarea value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} className="h-4 w-4 accent-[#061b0e] dark:accent-emerald-500" />
            Featured package
          </label>
        </form>
      </Drawer>
    </div>
  );
}
