"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { adminDelete, adminGet, adminPost } from "@/lib/admin/api";
import type { AvailabilityBlock, Booking, Unit } from "@/lib/admin/types";
import { formatDate } from "@/lib/admin/format";
import { Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Modal";
import { cn } from "@/lib/cn";

type CalendarData = { units: Unit[]; bookings: Booking[]; blocks: AvailabilityBlock[]; maintenance: { id: string; unitId: string | null; unit?: { name: string } | null; title: string; status: string }[] };

const STATUS_BG: Record<string, string> = {
  HOLD: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  PENDING_PAYMENT: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  CONFIRMED: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  COMPLETED: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  CANCELLED: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
};

export default function CalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blockModal, setBlockModal] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminGet<CalendarData>("/admin/calendar")
      .then((value) => {
        setData(value);
        setUnitId(value.units[0]?.id ?? "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Build day grid for current month
  const grid = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let index = 0; index < startOffset; index += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
    return cells;
  }, []);

  const dayKey = (date: Date) => date.toISOString().slice(0, 10);

  async function createBlock(event: React.FormEvent) {
    event.preventDefault();
    if (!unitId || !startDate || !endDate || !reason) return;
    setSaving(true);
    try {
      await adminPost("/admin/availability-blocks", { unitId, startDate, endDate, reason, notes: notes || undefined });
      toast.success("Block created");
      setBlockModal(false);
      setReason("");
      setNotes("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create block");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: string) {
    try {
      await adminDelete(`/admin/availability-blocks/${id}`);
      toast.success("Block removed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove block");
    }
  }

  if (loading) return <PageHeader title="Calendar" description="Loading…" />;
  if (error) return <EmptyState title="Could not load calendar" description={error} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Reservation & Availability Calendar"
        description={`Live room availability, occupied dates, and maintenance blocks · ${data.units.length} unit${data.units.length === 1 ? "" : "s"}`}
        breadcrumbs={[{ label: "Calendar" }]}
        actions={<Button onClick={() => setBlockModal(true)}>+ Block Room Dates</Button>}
      />

      {/* Blocks & maintenance summary */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Room Availability Blocks" subtitle="Dates temporarily taken off sale" />
          <div className="divide-y divide-outline-variant/40 dark:divide-white/5">
            {data.blocks.length === 0 && <p className="px-5 py-4 text-sm text-on-surface-variant dark:text-neutral-400">No active date blocks currently set.</p>}
            {data.blocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-normal">{block.reason}</p>
                  <p className="text-xs text-on-surface-variant dark:text-neutral-400">{block.unit?.name} · {formatDate(block.startDate)} → {formatDate(block.endDate)}</p>
                </div>
                <button onClick={() => removeBlock(block.id)} className="rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error/5 dark:hover:bg-rose-500/10">Unblock</button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Active Maintenance Issues" subtitle="Reported issues affecting availability" />
          <div className="divide-y divide-outline-variant/40 dark:divide-white/5">
            {data.maintenance.length === 0 && <p className="px-5 py-4 text-sm text-on-surface-variant dark:text-neutral-400">No open maintenance issues affecting room sale.</p>}
            {data.maintenance.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{issue.title}</p>
                  <p className="text-xs text-on-surface-variant dark:text-neutral-400">{issue.unit?.name ?? "Property-wide"}</p>
                </div>
                <StatusBadge status={issue.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Month grid */}
      <Card>
        <CardHeader title={new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })} subtitle="Confirmed guest stays and blocked calendar dates" />
        <div className="overflow-x-auto p-4">
          <div className="grid min-w-[1100px] grid-cols-7 gap-2 text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="pb-1 text-center text-[10px] font-normal uppercase tracking-wider text-on-surface-variant dark:text-neutral-500">
                {day}
              </div>
            ))}
            {grid.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} />;
              const key = dayKey(date);
              const dayBookings = data.bookings.filter((booking) => {
                const start = booking.checkInDate.slice(0, 10);
                const end = booking.checkOutDate.slice(0, 10);
                return key >= start && key < end;
              });
              const dayBlocks = data.blocks.filter((block) => key >= block.startDate.slice(0, 10) && key < block.endDate.slice(0, 10));
              const isToday = key === new Date().toISOString().slice(0, 10);
              return (
                <div key={key} className={cn("min-h-[92px] rounded-lg border p-1.5", isToday ? "border-[#061b0e] bg-[#061b0e]/5 dark:border-emerald-500 dark:bg-emerald-500/10" : "border-outline-variant/50 dark:border-white/10")}>
                  <p className={cn("mb-1 text-[11px] font-normal", isToday ? "text-[#061b0e] dark:text-emerald-300" : "text-on-surface-variant dark:text-neutral-500")}>{date.getDate()}</p>
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map((booking) => (
                      <a key={booking.id} href={`/admin/bookings/${booking.id}`} className={cn("block truncate rounded px-1.5 py-0.5 text-[10px] font-medium", STATUS_BG[booking.bookingStatus] ?? "bg-neutral-500/20 text-neutral-600")}>
                        {booking.guest?.firstName} · {booking.reference}
                      </a>
                    ))}
                    {dayBlocks.map((block) => (
                      <span key={block.id} className="block truncate rounded bg-neutral-500/20 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 line-through dark:text-neutral-400">
                        {block.reason}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Modal
        open={blockModal}
        onClose={() => setBlockModal(false)}
        title="Block Room Dates"
        footer={
          <>
            <Button variant="outline" onClick={() => setBlockModal(false)}>Cancel</Button>
            <Button onClick={createBlock} loading={saving}>Confirm Date Block</Button>
          </>
        }
      >
        <form onSubmit={createBlock} className="space-y-4">
          <Field label="Select Room / Villa Unit">
            <Select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
              {data.units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Block Start Date">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </Field>
            <Field label="Block End Date">
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required min={startDate} />
            </Field>
          </div>
          <Field label="Reason for Blocking">
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Scheduled deep cleaning, private owner use, VIP hold" required />
          </Field>
          <Field label="Additional Staff Notes (Optional)">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any additional notes for front desk or housekeeping staff..." />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
