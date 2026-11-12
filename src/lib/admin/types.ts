export type AdminUser = { id: string; name: string; email: string; role: string; active: boolean; lastLoginAt?: string | null; createdAt?: string };

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number; pages: number };

export type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country?: string | null;
  address?: string | null;
  identityDocumentReference?: string | null;
  marketingConsent: boolean;
  preferences?: Record<string, unknown> | null;
  internalNotes?: string | null;
  createdAt: string;
  _count?: { bookings: number };
};

export type Unit = {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  description?: string | null;
  unitType: string;
  inventoryCount: number;
  bedrooms: number;
  bathrooms: number;
  baseOccupancy: number;
  maximumOccupancy: number;
  active: boolean;
};

export type Package = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription?: string | null;
  cancellationPolicy?: string | null;
  terms?: string | null;
  basePrice: string;
  pricingType: string;
  includedAdults: number;
  maximumGuests: number;
  minimumNights: number;
  maximumNights: number;
  depositPercentage: string;
  mealPlan?: string | null;
  featured: boolean;
  active: boolean;
  displayOrder: number;
  unit?: Unit | null;
  images?: { id: string; imageUrl: string; altText: string }[];
  seasonalRates?: SeasonalRate[];
  dateOverrides?: DateRateOverride[];
};

export type SeasonalRate = {
  id: string;
  packageId: string;
  name: string;
  startDate: string;
  endDate: string;
  nightlyPrice: string;
  weekendPrice?: string | null;
  minimumNights?: number | null;
  priority: number;
  active: boolean;
};

export type DateRateOverride = {
  id: string;
  packageId: string;
  date: string;
  price?: string | null;
  minimumNights?: number | null;
  closed: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  note?: string | null;
};

export type Payment = {
  id: string;
  bookingId: string;
  provider: string;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  amount: string;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  verified: boolean;
  failureReason?: string | null;
  processedAt?: string | null;
  createdAt: string;
  booking?: BookingLite;
  events?: PaymentEvent[];
};

export type PaymentEvent = {
  id: string;
  eventType: string;
  status: string;
  processedAt?: string | null;
  createdAt: string;
};

export type BookingLite = {
  id: string;
  reference: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  bookingStatus: string;
  paymentStatus: string;
  guest?: Guest;
  package?: Package;
  unit?: { id: string; name: string } | null;
  createdAt?: string;
  internalNotes?: string | null;
};

export type Booking = BookingLite & {
  unitId: string;
  packageId: string;
  guestId: string;
  adults: number;
  children: number;
  infants: number;
  subtotal: string;
  addOnTotal: string;
  discountTotal: string;
  taxTotal: string;
  serviceChargeTotal: string;
  depositRequired: string;
  currency: string;
  paymentOption: string;
  source: string;
  specialRequests?: string | null;
  internalNotes?: string | null;
  cancellationReason?: string | null;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  unit?: Unit;
  priceLines?: BookingPriceLine[];
  addOns?: BookingAddOn[];
  payments?: Payment[];
  auditTrail?: AuditLogEntry[];
};

export type BookingPriceLine = {
  id: string;
  type: string;
  description: string;
  serviceDate?: string | null;
  quantity: number;
  unitAmount: string;
  totalAmount: string;
};

export type BookingAddOn = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  total: string;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown | null;
  newValues?: unknown | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  adminUser?: { id: string; name: string; email: string; role: string } | null;
};

export type AvailabilityBlock = {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string | null;
  createdById?: string | null;
  unit?: Unit;
  createdBy?: { id: string; name: string } | null;
};

export type HousekeepingTask = {
  id: string;
  unitId: string;
  scheduledDate: string;
  status: string;
  assignedToId?: string | null;
  notes?: string | null;
  completedAt?: string | null;
  assignedTo?: { id: string; name: string } | null;
};

export type MaintenanceIssue = {
  id: string;
  propertyId: string;
  unitId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignedToId?: string | null;
  reportedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  unit?: Unit | null;
  assignedTo?: { id: string; name: string; role: string } | null;
  reportedBy?: { id: string; name: string; role: string } | null;
};

export type DashboardData = {
  kpis: {
    todayRevenue: number;
    todayPaid: number;
    occupancyPct: number;
    checkInsToday: number;
    checkOutsToday: number;
    pendingBookings: number;
    pendingPayments: number;
    availableRooms: number;
    totalGuests: number;
    totalBookings: number;
  };
  charts: {
    bookingTrend: { date: string; bookings: number }[];
    revenueTrend: { date: string; revenue: number }[];
    occupancy: { inHouse: number; available: number; pct: number };
  };
  arrivals: BookingLite[];
  recentBookings: BookingLite[];
  recentPayments: Payment[];
  notifications: AuditLogEntry[];
};

export type RoomWithStatus = {
  unit: Unit;
  status: string;
  activeBookings: BookingLite[];
  housekeeping: HousekeepingTask | null;
  maintenance: MaintenanceIssue | null;
};
