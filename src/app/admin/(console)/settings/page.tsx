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
      <PageHeader
        title="Resort Configuration & Policies"
        description="Manage property profile, guest contacts, tax & service surcharge rates, and confirmation email notices"
        breadcrumbs={[{ label: "Settings" }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={(event) => save(event, "resort")}>
          <Card>
            <CardHeader title="Resort Profile & Contact Info" subtitle="Property identity and direct guest communication" action={<Button size="sm" type="submit" loading={saving}>Save Changes</Button>} />
            <CardBody className="space-y-4">
              <Field label="Resort & Property Name">
                <Input value={settings.resort.name} onChange={(event) => set("resort", "name", event.target.value)} />
              </Field>
              <Field label="Marketing Tagline / Subtitle">
                <Input value={settings.resort.tagline} onChange={(event) => set("resort", "tagline", event.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Inquiries & Support Email">
                  <Input type="email" value={settings.resort.contactEmail} onChange={(event) => set("resort", "contactEmail", event.target.value)} />
                </Field>
                <Field label="Front Desk Hotline / Phone">
                  <Input value={settings.resort.contactPhone} onChange={(event) => set("resort", "contactPhone", event.target.value)} />
                </Field>
              </div>
              <Field label="Physical Property Address">
                <Input value={settings.resort.address} onChange={(event) => set("resort", "address", event.target.value)} />
              </Field>
              <Field label="Primary Display Currency">
                <Input value={settings.resort.currency} onChange={(event) => set("resort", "currency", event.target.value)} />
              </Field>
            </CardBody>
          </Card>
        </form>

        <form onSubmit={(event) => save(event, "taxes")}>
          <Card>
            <CardHeader title="Taxes & Surcharges" subtitle="Mandatory government taxes and resort service charges" action={<Button size="sm" type="submit" loading={saving}>Save Changes</Button>} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Government Tax Rate (%)">
                  <Input type="number" min={0} max={100} step="0.01" value={String(settings.taxes.taxPercentage)} onChange={(event) => set("taxes", "taxPercentage", Number(event.target.value))} />
                </Field>
                <Field label="Service Charge Rate (%)">
                  <Input type="number" min={0} max={100} step="0.01" value={String(settings.taxes.serviceChargePercentage)} onChange={(event) => set("taxes", "serviceChargePercentage", Number(event.target.value))} />
                </Field>
              </div>
              <Field label="Bank Transfer Payment Instructions" hint="Displayed to guests on checkout when selecting bank deposit payment">
                <Textarea value={settings.payments.bankInstructions} onChange={(event) => set("payments", "bankInstructions", event.target.value)} placeholder="Provide beneficiary account name, account number, bank, and branch..." />
              </Field>
            </CardBody>
          </Card>
        </form>

        <form onSubmit={(event) => save(event, "cancellation")}>
          <Card>
            <CardHeader title="Cancellation & Refund Policy" subtitle="Standard cancellation windows and refund terms" action={<Button size="sm" type="submit" loading={saving}>Save Changes</Button>} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Free Cancellation Window (Days Before Arrival)">
                  <Input type="number" min={0} value={String(settings.cancellation.freeCancellationDays)} onChange={(event) => set("cancellation", "freeCancellationDays", Number(event.target.value))} />
                </Field>
                <Field label="Eligible Refund Rate (%)">
                  <Input type="number" min={0} max={100} value={String(settings.cancellation.refundPercentage)} onChange={(event) => set("cancellation", "refundPercentage", Number(event.target.value))} />
                </Field>
              </div>
              <Field label="Full Policy Text Description">
                <Textarea value={settings.cancellation.policy} onChange={(event) => set("cancellation", "policy", event.target.value)} placeholder="Detailed terms explaining conditions for cancellations, force majeure, or no-shows..." />
              </Field>
            </CardBody>
          </Card>
        </form>

        <form onSubmit={(event) => save(event, "branding")}>
          <Card>
            <CardHeader title="Branding & Visual Identity" subtitle="Resort emblem and interface color scheme" action={<Button size="sm" type="submit" loading={saving}>Save Changes</Button>} />
            <CardBody className="space-y-4">
              <Field label="Resort Logo Path / URL">
                <Input value={settings.branding.logoUrl} onChange={(event) => set("branding", "logoUrl", event.target.value)} placeholder="/logo.png" />
              </Field>
              <Field label="Primary Theme Color">
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
        <CardHeader title="Email Notification: Booking Confirmation Notice" subtitle="Automated email sent to guests immediately upon confirming a reservation" action={<Button size="sm" onClick={() => save({ preventDefault: () => {} } as FormEvent, "emailTemplates")} loading={saving}>Save Changes</Button>} />
        <CardBody className="space-y-4">
          <Field label="Email Subject Line">
            <Input value={settings.emailTemplates.bookingConfirmed.subject} onChange={(event) => set("emailTemplates", "bookingConfirmed", { ...settings.emailTemplates.bookingConfirmed, subject: event.target.value })} />
          </Field>
          <Field label="Email Body Message" hint="Available dynamic tags: {guestName}, {reference}, {checkIn}, {checkOut}, {grandTotal}">
            <Textarea value={settings.emailTemplates.bookingConfirmed.body} onChange={(event) => set("emailTemplates", "bookingConfirmed", { ...settings.emailTemplates.bookingConfirmed, body: event.target.value })} />
          </Field>
        </CardBody>
      </Card>
    </div>
  );
}
