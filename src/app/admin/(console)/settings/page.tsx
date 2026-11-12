"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminGet, adminPatch } from "@/lib/admin/api";
import { Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Textarea } from "@/components/admin/ui";

type Settings = {
  resort: { name: string; tagline: string; contactEmail: string; contactPhone: string; address: string; currency: string };
  taxes: { taxPercentage: number; serviceChargePercentage: number };
  payments: { methods: { id: string; label: string; enabled: boolean }[]; bankInstructions: string };
  cancellation: { policy: string; freeCancellationDays: number; refundPercentage: number };
  branding: { logoUrl: string; primaryColor: string };
  emailTemplates: { bookingConfirmed: { subject: string; body: string } };
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminGet<Settings>("/admin/settings")
      .then(setSettings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function save(event: FormEvent, section: keyof Settings) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await adminPatch("/admin/settings", { [section]: settings[section] });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageHeader title="Settings" description="Loading…" />;
  if (error || !settings) return <EmptyState title="Could not load settings" description={error} />;

  const set = (section: keyof Settings, key: string, value: unknown) => {
    setSettings((current) => (current ? { ...current, [section]: { ...current[section], [key]: value } } : current));
  };

  return (
    <div>
      <PageHeader title="Settings" description="Resort configuration, taxes, payments and policies" breadcrumbs={[{ label: "Settings" }]} />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={(event) => save(event, "resort")}>
          <Card>
            <CardHeader title="Resort information" action={<Button size="sm" type="submit" loading={saving}>Save</Button>} />
            <CardBody className="space-y-4">
              <Field label="Resort name">
                <Input value={settings.resort.name} onChange={(event) => set("resort", "name", event.target.value)} />
              </Field>
              <Field label="Tagline">
                <Input value={settings.resort.tagline} onChange={(event) => set("resort", "tagline", event.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact email">
                  <Input type="email" value={settings.resort.contactEmail} onChange={(event) => set("resort", "contactEmail", event.target.value)} />
                </Field>
                <Field label="Contact phone">
                  <Input value={settings.resort.contactPhone} onChange={(event) => set("resort", "contactPhone", event.target.value)} />
                </Field>
              </div>
              <Field label="Address">
                <Input value={settings.resort.address} onChange={(event) => set("resort", "address", event.target.value)} />
              </Field>
              <Field label="Currency">
                <Input value={settings.resort.currency} onChange={(event) => set("resort", "currency", event.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </form>

        <form onSubmit={(event) => save(event, "taxes")}>
          <Card>
            <CardHeader title="Taxes & charges" action={<Button size="sm" type="submit" loading={saving}>Save</Button>} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tax %">
                  <Input type="number" min={0} max={100} step="0.01" value={String(settings.taxes.taxPercentage)} onChange={(event) => set("taxes", "taxPercentage", Number(event.target.value))} />
                </Field>
                <Field label="Service charge %">
                  <Input type="number" min={0} max={100} step="0.01" value={String(settings.taxes.serviceChargePercentage)} onChange={(event) => set("taxes", "serviceChargePercentage", Number(event.target.value))} />
                </Field>
              </div>
              <Field label="Bank transfer instructions" hint="Shown to guests choosing bank transfer">
                <Textarea value={settings.payments.bankInstructions} onChange={(event) => set("payments", "bankInstructions", event.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </form>

        <form onSubmit={(event) => save(event, "cancellation")}>
          <Card>
            <CardHeader title="Cancellation policy" action={<Button size="sm" type="submit" loading={saving}>Save</Button>} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Free cancellation (days before arrival)">
                  <Input type="number" min={0} value={String(settings.cancellation.freeCancellationDays)} onChange={(event) => set("cancellation", "freeCancellationDays", Number(event.target.value))} />
                </Field>
                <Field label="Refund %">
                  <Input type="number" min={0} max={100} value={String(settings.cancellation.refundPercentage)} onChange={(event) => set("cancellation", "refundPercentage", Number(event.target.value))} />
                </Field>
              </div>
              <Field label="Policy text">
                <Textarea value={settings.cancellation.policy} onChange={(event) => set("cancellation", "policy", event.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </form>

        <form onSubmit={(event) => save(event, "branding")}>
          <Card>
            <CardHeader title="Branding" action={<Button size="sm" type="submit" loading={saving}>Save</Button>} />
            <CardBody className="space-y-4">
              <Field label="Logo URL">
                <Input value={settings.branding.logoUrl} onChange={(event) => set("branding", "logoUrl", event.target.value)} placeholder="/logo.png" />
              </Field>
              <Field label="Primary color">
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.branding.primaryColor} onChange={(event) => set("branding", "primaryColor", event.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-outline-variant bg-transparent dark:border-white/15" />
                  <Input value={settings.branding.primaryColor} onChange={(event) => set("branding", "primaryColor", event.target.value)} className="w-32" />
                </div>
              </Field>
            </CardBody>
          </Card>
        </form>
      </div>

      <Card className="mt-6">
        <CardHeader title="Email template — booking confirmed" action={<Button size="sm" onClick={() => save({ preventDefault: () => {} } as FormEvent, "emailTemplates")} loading={saving}>Save</Button>} />
        <CardBody className="space-y-4">
          <Field label="Subject">
            <Input value={settings.emailTemplates.bookingConfirmed.subject} onChange={(event) => set("emailTemplates", "bookingConfirmed", { ...settings.emailTemplates.bookingConfirmed, subject: event.target.value })} />
          </Field>
          <Field label="Body" hint="Supports {guestName}, {reference}, {checkIn}, {checkOut} placeholders">
            <Textarea value={settings.emailTemplates.bookingConfirmed.body} onChange={(event) => set("emailTemplates", "bookingConfirmed", { ...settings.emailTemplates.bookingConfirmed, body: event.target.value })} />
          </Field>
        </CardBody>
      </Card>
    </div>
  );
}
