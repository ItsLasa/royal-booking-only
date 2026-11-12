"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminDelete, adminGet, adminPatch, adminPost } from "@/lib/admin/api";
import type { AddOnPricingType, AdminAddOn } from "@/lib/admin/types";
import { lkr } from "@/lib/admin/format";
import { Button, Card, CardBody, EmptyState, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@/components/admin/ui";
import { ConfirmDialog, Drawer } from "@/components/admin/Modal";

type AddOnForm = {
  name: string;
  description: string;
  pricingType: AddOnPricingType;
  price: string;
  maximumQuantity: string;
  active: boolean;
};

const EMPTY: AddOnForm = {
  name: "",
  description: "",
  pricingType: "PER_BOOKING",
  price: "",
  maximumQuantity: "1",
  active: true,
};

const PRICING_TYPE_LABELS: Record<AddOnPricingType, string> = {
  PER_BOOKING: "Per Booking",
  PER_NIGHT: "Per Night",
  PER_GUEST: "Per Guest",
  PER_GUEST_PER_NIGHT: "Per Guest / Night",
};

export default function AddOnsPage() {
  const [addOns, setAddOns] = useState<AdminAddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAddOn | null>(null);
  const [form, setForm] = useState<AddOnForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminAddOn | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    adminGet<AdminAddOn[]>("/admin/add-ons")
      .then(setAddOns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setDrawerOpen(true);
  }

  function openEdit(item: AdminAddOn) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      pricingType: item.pricingType,
      price: String(item.price),
      maximumQuantity: String(item.maximumQuantity || 1),
      active: item.active,
    });
    setDrawerOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a name for the extra.");
      return;
    }
    const numPrice = Number(form.price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error("Please enter a valid non-negative price.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      pricingType: form.pricingType,
      price: numPrice,
      maximumQuantity: Math.max(1, parseInt(form.maximumQuantity, 10) || 1),
      active: form.active,
    };

    try {
      if (editing) {
        await adminPatch(`/admin/add-ons/${editing.id}`, payload);
        toast.success("Extra updated successfully");
      } else {
        await adminPost("/admin/add-ons", payload);
        toast.success("New extra created successfully");
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save extra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminDelete<{ deleted: boolean; deactivated?: boolean; message?: string }>(`/admin/add-ons/${deleteTarget.id}`);
      if (res?.deactivated) {
        toast.info(res.message || "Extra was deactivated because it is linked to bookings.");
      } else {
        toast.success("Extra deleted successfully");
      }
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete extra");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(item: AdminAddOn) {
    try {
      await adminPatch(`/admin/add-ons/${item.id}`, { active: !item.active });
      toast.success(`${item.name} is now ${!item.active ? "active" : "inactive"}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Available Extras & Add-ons"
        description="Manage meals, services, and optional extras shown to guests on the booking page."
        actions={<Button onClick={openCreate}>+ Add New Extra</Button>}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-surface-container" />
          ))}
        </div>
      ) : addOns.length === 0 ? (
        <EmptyState
          title="No available extras configured yet"
          description="Add breakfast, airport pickup, BBQ dinner, or special tour packages to offer guests during checkout."
          action={<Button onClick={openCreate}>Create First Extra</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {addOns.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between overflow-hidden">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-normal text-on-surface dark:text-white text-base">{item.name}</h3>
                    <p className="text-xs text-on-surface-variant dark:text-neutral-400 mt-0.5">
                      {PRICING_TYPE_LABELS[item.pricingType] || item.pricingType}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(item)}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    title="Click to toggle active status"
                  >
                    <StatusBadge status={item.active ? "ACTIVE" : "INACTIVE"} />
                  </button>
                </div>

                {item.description && (
                  <p className="text-xs text-on-surface-variant dark:text-neutral-300 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="pt-2 border-t border-outline-variant/30 dark:border-white/10 flex items-center justify-between text-sm">
                  <span className="font-normal text-primary dark:text-emerald-400 text-lg">
                    {lkr(Number(item.price))}
                  </span>
                  <span className="text-xs text-on-surface-variant dark:text-neutral-400">
                    Max: {item.maximumQuantity} per reservation
                  </span>
                </div>
              </CardBody>

              <div className="flex items-center gap-2 border-t border-outline-variant/40 bg-surface-container-low px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.02]">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(item)}>
                  Edit Details
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 dark:text-red-400" onClick={() => setDeleteTarget(item)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit Extra: ${editing.name}` : "Create New Available Extra"}
        side="right"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSubmit}>
              {editing ? "Save Changes" : "Create Extra"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Service / Extra Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Candlelight Dinner, Airport Transfer, BBQ Setup"
              required
            />
          </Field>

          <Field label="Pricing Model">
            <Select
              value={form.pricingType}
              onChange={(e) => setForm({ ...form, pricingType: e.target.value as AddOnPricingType })}
            >
              <option value="PER_BOOKING">Per Booking (One-time flat fee)</option>
              <option value="PER_NIGHT">Per Night (Multiplied by nights stayed)</option>
              <option value="PER_GUEST">Per Guest (Multiplied by guest count)</option>
              <option value="PER_GUEST_PER_NIGHT">Per Guest / Per Night (e.g. Daily Breakfast)</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (LKR)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="2500"
                required
              />
            </Field>

            <Field label="Maximum Selectable Quantity">
              <Input
                type="number"
                min="1"
                max="50"
                value={form.maximumQuantity}
                onChange={(e) => setForm({ ...form, maximumQuantity: e.target.value })}
                placeholder="1"
                required
              />
            </Field>
          </div>

          <Field label="Description & Guest Information (Optional)">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what is included in this service for guests viewing the booking page..."
            />
          </Field>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-on-surface dark:text-neutral-200">
                Active (Display on public booking engine)
              </span>
            </label>
          </div>
        </form>
      </Drawer>

      {/* Delete / Deactivate Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Available Extra"
        message={`Are you sure you want to remove "${deleteTarget?.name}"? If any reservations have already selected this extra, it will be deactivated instead of deleted.`}
        confirmLabel="Confirm Removal"
        danger
        loading={deleting}
      />
    </div>
  );
}
