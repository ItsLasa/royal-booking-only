"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminGet, adminPatch } from "@/lib/admin/api";
import type { HousekeepingTask, Unit } from "@/lib/admin/types";
import { formatDate, HOUSEKEEPING_LABELS } from "@/lib/admin/format";
import { Button, EmptyState, Input, PageHeader, StatusBadge } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

type BoardRow = { unit: Unit; status: string; task: HousekeepingTask | null };

type Board = { date: string; board: BoardRow[]; staff: { id: string; name: string; role: string }[]; counts: Record<string, number>; totalUnits: number };

const STATUSES = ["DIRTY", "ASSIGNED", "CLEANING", "READY", "INSPECTED"];

export default function HousekeepingPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = (target?: string) => {
    setLoading(true);
    adminGet<Board>(`/admin/housekeeping?date=${target ?? date}`)
      .then(setBoard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  async function setStatus(unitId: string, status: string, assignedToId?: string | null) {
    setActing(unitId);
    try {
      await adminPatch("/admin/housekeeping/tasks", { unitId, scheduledDate: date, status, assignedToId: assignedToId ?? null });
      toast.success(`Room marked ${HOUSEKEEPING_LABELS[status].toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActing(null);
    }
  }

  if (loading && !board) return <PageHeader title="Housekeeping" description="Loading…" />;
  if (error) return <EmptyState title="Could not load housekeeping" description={error} />;
  if (!board) return null;

  return (
    <div>
      <PageHeader
        title="Housekeeping & Inspection Board"
        description={`Daily cleaning schedules, room turnaround, and inspection status for ${formatDate(board.date)}`}
        breadcrumbs={[{ label: "Housekeeping" }]}
        actions={
          <Input type="date" value={date} onChange={(event) => { setDate(event.target.value); load(event.target.value); }} className="w-44" />
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-white/5">
            <span className={cn("h-2 w-2 rounded-full", statusDot(status))} />
            {HOUSEKEEPING_LABELS[status]} · {board.counts[status] ?? 0}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-white/5">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Occupied by Guests · {board.counts.OCCUPIED ?? 0}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {board.board.map((row) => {
          const isOccupied = row.status === "OCCUPIED";
          const task = row.task;
          return (
            <div key={row.unit.id} className={cn("rounded-xl border bg-white p-4 dark:bg-[#12171c]", isOccupied ? "border-sky-500/40" : "border-outline-variant/60 dark:border-white/10")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-normal text-on-surface dark:text-white">{row.unit.name}</h3>
                  <p className="text-xs text-on-surface-variant dark:text-neutral-400">{row.unit.bedrooms} bed · {row.unit.bathrooms} bath</p>
                </div>
                <StatusBadge status={row.status} label={isOccupied ? "Occupied" : HOUSEKEEPING_LABELS[row.status]} />
              </div>

              {task?.assignedTo && (
                <p className="mt-2 text-xs text-on-surface-variant dark:text-neutral-400">
                  Assigned Housekeeper: <span className="font-medium text-on-surface dark:text-white">{task.assignedTo.name}</span>
                  {task.notes && <span className="block truncate text-neutral-500">{task.notes}</span>}
                </p>
              )}

              {!isOccupied && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {STATUSES.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={row.status === status ? "primary" : "outline"}
                      loading={acting === row.unit.id}
                      onClick={() => setStatus(row.unit.id, status)}
                    >
                      {status === "DIRTY" ? "Mark Dirty" : status === "CLEANING" ? "Start Cleaning" : status === "READY" ? "Mark Ready" : status === "INSPECTED" ? "Mark Inspected" : HOUSEKEEPING_LABELS[status]}
                    </Button>
                  ))}
                </div>
              )}
              {isOccupied && (
                <p className="mt-3 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                  Guests currently in house — schedule full cleaning turnaround after departure.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    DIRTY: "bg-amber-500",
    ASSIGNED: "bg-sky-500",
    CLEANING: "bg-sky-500",
    READY: "bg-emerald-500",
    INSPECTED: "bg-emerald-500",
  };
  return map[status] ?? "bg-neutral-400";
}
