export function lkr(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(value: string | Date) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  HOLD: "Hold",
  PENDING_PAYMENT: "Pending Payment",
  PAYMENT_PROCESSING: "Processing Payment",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  EXPIRED: "Expired",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "Refund Pending",
  PARTIALLY_REFUNDED: "Partially Refunded",
  REFUNDED: "Refunded",
};

export const HOUSEKEEPING_LABELS: Record<string, string> = {
  DIRTY: "Needs Cleaning",
  ASSIGNED: "Assigned",
  CLEANING: "Cleaning in Progress",
  READY: "Clean & Ready",
  INSPECTED: "Inspected & Verified",
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  REPORTED: "Reported",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Resolved",
};

export const MAINTENANCE_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low Priority",
  MEDIUM: "Medium Priority",
  HIGH: "High Priority",
  URGENT: "Urgent",
};

export const ROOM_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  DIRTY: "Dirty",
  ASSIGNED: "Assigned",
  CLEANING: "Cleaning",
  READY: "Ready",
  INSPECTED: "Inspected",
  BLOCKED: "Blocked",
  MAINTENANCE: "Under Maintenance",
};

export const BOOKING_SOURCE_LABELS: Record<string, string> = {
  ADMIN: "Direct Front Desk",
  PHONE: "Phone Reservation",
  WALK_IN: "Walk-in Guest",
  BOOKING_COM: "Booking.com",
  AIRBNB: "Airbnb",
  AGODA: "Agoda",
  OTHER: "Other Channel",
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  PAYHERE: "PayHere Online",
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash at Front Desk",
};

export const STAFF_ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner / Director",
  MANAGER: "General Manager",
  STAFF: "Operations Staff",
  RECEPTION: "Front Desk / Reception",
  HOUSEKEEPING: "Housekeeping Team",
  MAINTENANCE: "Maintenance & Engineering",
  ACCOUNTANT: "Financial Accountant",
};

export function humanize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    // positive / active
    CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    READY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    INSPECTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    // warning
    HOLD: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    PENDING_PAYMENT: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    PAYMENT_PROCESSING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    UNPAID: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    PARTIALLY_PAID: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    DIRTY: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    ASSIGNED: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    CLEANING: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    OCCUPIED: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    IN_PROGRESS: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    REPORTED: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    FAILED: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    NO_SHOW: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    EXPIRED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-300",
    REFUNDED: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
    PARTIALLY_REFUNDED: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
    REFUND_PENDING: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
    BLOCKED: "bg-neutral-200 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-300",
    MAINTENANCE: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
    LOW: "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-300",
    MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
    URGENT: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  };
  return map[status] ?? "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-300";
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
