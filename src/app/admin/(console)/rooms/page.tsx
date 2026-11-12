"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminGet, adminPatch } from "@/lib/admin/api";
import type { RoomWithStatus } from "@/lib/admin/types";
import { formatDate, lkr, ROOM_STATUS_LABELS } from "@/lib/admin/format";
import { Button, Card, CardBody, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<string, string> = {
  AVAILABLE: "border-emerald-500/40",
  OCCUPIED: "border-sky-500/40",
  DIRTY: "border-amber-500/40",
  CLEANING: "border-sky-500/40",
  READY: "border-emerald-500/40",
  BLOCKED: "border-neutral-400/50",
  MAINTENANCE: "border-orange-500/40",
};

export default function RoomsPage() {
  const [data, setData] = useState<{ rooms: RoomWithStatus[]; today: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    adminGet<{ rooms: RoomWithStatus[]; today: string }>("/admin/rooms")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function setHousekeeping(unitId: string, status: string) {
    const today = data?.today ?? new Date().toISOString().slice(0, 10);
    try {
      await adminPatch("/admin/housekeeping/tasks", { unitId, scheduledDate: today, status });
      toast.success(`Marked ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (loading) return <PageHeader title="Rooms" description="Loading…" />;
  if (error) return <EmptyState title="Could not load rooms" description={error} />;
  if (!data) return null;

  const counts = data.rooms.reduce<Record<string, number>>((acc, room) => {
    acc[room.status] = (acc[room.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Rooms & units"
        description={`Live status for ${data.rooms.length} room${data.rooms.length === 1 ? "" : "s"} · ${data.today}`}
        breadcrumbs={[{ label: "Rooms" }]}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {Object.entries(counts).map(([status, count]) => (
          <span key={status} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-white/5">
            <span className="h-2 w-2 rounded-full bg-current text-[#061b0e] dark:text-emerald-400" />
            {ROOM_STATUS_LABELS[status] ?? status} · {count}
          </span>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.rooms.map(({ unit, status, activeBookings, housekeeping, maintenance }) => (
          <Card key={unit.id} className={cn("border-l-4", STATUS_TONE[status] ?? "border-outline-variant/40")}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-on-surface dark:text-white">{unit.name}</h3>
                  <p className="mt-0.5 text-xs text-on-surface-variant dark:text-neutral-400">
                    {unit.bedrooms} bed · {unit.bathrooms} bath · max {unit.maximumOccupancy} guests
                  </p>
                </div>
                <StatusBadge status={status} label={ROOM_STATUS_LABELS[status] ?? status} />
              </div>

              {activeBookings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {activeBookings.map((booking) => (
                    <a key={booking.id} href={`/admin/bookings/${booking.id}`} className="block rounded-lg bg-surface-container/70 p-2.5 transition-colors hover:bg-surface-container dark:bg-white/5 dark:hover:bg-white/10">
                      <p className="text-sm font-medium">
                        {booking.guest?.firstName} {booking.guest?.lastName}
                      </p>
                      <p className="text-xs text-on-surface-variant dark:text-neutral-400">
                        {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)} · {lkr(booking.grandTotal)}
                      </p>
                    </a>
                  ))}
                </div>
              )}

              {maintenance && (
                <p className="mt-3 rounded-lg bg-orange-500/10 px-2.5 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300">
                  Maintenance: {maintenance.title}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setHousekeeping(unit.id, "DIRTY")}>Dirty</Button>
                <Button size="sm" variant="outline" onClick={() => setHousekeeping(unit.id, "CLEANING")}>Cleaning</Button>
                <Button size="sm" variant="outline" onClick={() => setHousekeeping(unit.id, "READY")}>Ready</Button>
                <Button size="sm" variant="outline" onClick={() => setHousekeeping(unit.id, "INSPECTED")}>Inspected</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
