# Resort PMS Owner Console Implementation Prompt

## Role

You are a **Senior Software Architect** and **Senior Full-Stack Engineer**.

Your task is to design and implement a production-grade **Owner Console (Property Management System - PMS)** for my existing resort booking application.

---

# Existing System (Do Not Rebuild)

The following infrastructure already exists and **must be extended**, not replaced.

### Authentication & Security

- ✅ Secure Admin Authentication
- ✅ Signed HTTP-only Cookies
- ✅ bcrypt Password Hashing
- ✅ SHA-256 Session Hashes
- ✅ Role-Based Access Control (RBAC)
- ✅ Audit Logging

### Backend

- ✅ Service Layer Architecture
- ✅ Existing Admin APIs
  - 6 Read Endpoints
  - 1 Write Endpoint

### Frontend

- ✅ `/admin` Login Page

---

# Important Rules

Do **NOT** replace the existing architecture.

Instead:

- Extend the current system.
- Reuse the existing authentication.
- Reuse the service layer.
- Preserve middleware.
- Preserve coding conventions.
- Maintain backward compatibility.

---

# Goal

Transform the current admin area into a modern **Owner Console / PMS** similar to:

- Cloudbeds
- Hotelogix
- Mews
- Oracle OPERA
- RMS Cloud

The application should feel like professional hotel management software rather than a simple admin dashboard.

---

# Technical Requirements

The implementation must follow enterprise software engineering practices.

## Architecture

- SOLID Principles
- Clean Architecture
- Service Layer
- Thin Controllers
- Reusable Components
- RESTful APIs

## Security

- Continue using existing authentication
- Never bypass RBAC
- Validate every request
- Log every write action
- Record audit logs
- Protect against unauthorized access

## Code Quality

- Modular
- Scalable
- Maintainable
- Type-safe
- Production Ready

---

# Owner Console Layout

Implement a persistent admin shell.

```
+----------------------------------------------------------+
| Top Navigation                                            |
+-----------+----------------------------------------------+
| Sidebar   |                                              |
|           |                                              |
|           |              Main Content                    |
|           |                                              |
|           |                                              |
+-----------+----------------------------------------------+
```

---

## Top Navigation

Include:

- Resort Logo
- Resort Name
- Notifications
- Current User
- Profile Menu
- Logout

---

## Sidebar Navigation

```
Dashboard

Bookings

Calendar

Guests

Rooms

Rates

Packages

Payments

Housekeeping

Maintenance

Reports

Staff

Settings

Audit Logs
```

---

## Main Content

Include:

- Breadcrumb Navigation
- Search
- Filters
- Pagination
- Responsive Layout

---

# Module 1 — Dashboard

The dashboard should provide an instant overview of resort operations.

## KPI Cards

- Today's Revenue
- Occupancy %
- Today's Check-ins
- Today's Check-outs
- Pending Bookings
- Pending Payments
- Available Rooms
- Total Guests

## Charts

- Revenue Trend
- Booking Trend
- Occupancy Trend

## Widgets

- Recent Bookings
- Upcoming Arrivals
- Recent Payments
- Notifications

## Quick Actions

- New Booking
- Block Room
- Add Package
- Check In Guest
- Check Out Guest

---

# Module 2 — Booking Management

Implement complete booking management.

## Booking List

Display:

- Booking ID
- Guest
- Room
- Check-in
- Check-out
- Nights
- Amount
- Payment Status
- Booking Status

## Features

- Search
- Filters
- Sorting
- Pagination

## Booking Detail

Tabs:

- Summary
- Guest
- Payments
- Activity
- Notes

## Actions

- Create Booking
- Edit Booking
- Cancel Booking
- Check In
- Check Out
- Change Room
- Extend Stay
- Refund
- Print Invoice
- Send Confirmation

## Booking Status

- Pending
- Confirmed
- Checked In
- Checked Out
- Cancelled
- No Show
- Refunded

---

# Module 3 — Reservation Calendar

Create a hotel-style reservation calendar.

Features:

- Month View
- Week View
- Drag & Drop Reservations
- Resize Reservations
- Block Rooms
- Maintenance Blocks
- Housekeeping Blocks
- Overbooking Detection
- Color-coded Reservations

---

# Module 4 — Room Management

Manage:

- Rooms
- Room Types
- Amenities
- Images
- Capacity
- Availability
- Pricing

Room Status:

- Available
- Occupied
- Dirty
- Cleaning
- Maintenance
- Blocked

---

# Module 5 — Rate Management

Implement a pricing engine.

Support:

- Base Rate
- Weekend Rate
- Holiday Rate
- Seasonal Rate
- Long Stay Discounts
- Promo Codes
- Bulk Rate Update
- Date Range Pricing

---

# Module 6 — Package Management

Each package should contain:

- Name
- Description
- Price
- Discount
- Included Meals
- Activities
- Duration
- Images
- Availability
- Active Status

---

# Module 7 — Payment Management

Display:

- Payment History
- Pending Payments
- Successful Payments
- Failed Payments
- Refunds
- Outstanding Balance

Actions:

- Verify Payment
- Mark as Paid
- Refund
- Download Invoice
- Download Receipt

---

# Module 8 — Guest CRM

Maintain guest profiles.

Store:

- Personal Information
- Contact Details
- Booking History
- Payment History
- Preferences
- Internal Notes
- Uploaded Documents
- Reviews

---

# Module 9 — Housekeeping

Task Board

Statuses:

- Dirty
- Assigned
- Cleaning
- Ready
- Inspected

Allow assigning rooms to housekeeping staff.

---

# Module 10 — Maintenance

Track maintenance issues.

Workflow:

```
Reported
    ↓
Assigned
    ↓
In Progress
    ↓
Completed
```

---

# Module 11 — Reports

Generate reports for:

- Revenue
- Occupancy
- ADR
- RevPAR
- Booking Sources
- Cancellation Rate
- Package Performance
- Payments

Export:

- PDF
- Excel
- CSV

---

# Module 12 — Staff Management

Roles:

- Owner
- Manager
- Reception
- Housekeeping
- Maintenance
- Accountant

Use existing RBAC for permissions.

---

# Module 13 — Settings

Allow configuration of:

- Resort Information
- Taxes
- Payment Methods
- Email Templates
- SMS Templates
- Cancellation Policies
- Branding
- Staff Permissions

---

# Module 14 — Audit Logs

Display:

- User
- Action
- Resource
- Old Value
- New Value
- IP Address
- Browser
- Timestamp

Allow:

- Search
- Filter
- Pagination

---

# UI/UX Requirements

Use a modern hotel management design.

Include:

- Dashboard Cards
- Professional Data Tables
- Slide-over Drawers
- Confirmation Dialogs
- Toast Notifications
- Skeleton Loaders
- Empty States
- Responsive Sidebar
- Dark Mode
- Keyboard Shortcuts (where appropriate)

---

# API Requirements

Expand the existing APIs.

## Authentication

```
GET    /admin/me
POST   /admin/login
POST   /admin/logout
```

## Dashboard

```
GET /admin/dashboard
```

## Bookings

```
GET    /admin/bookings
GET    /admin/bookings/:id
POST   /admin/bookings
PATCH  /admin/bookings/:id
DELETE /admin/bookings/:id

POST /admin/bookings/:id/check-in
POST /admin/bookings/:id/check-out
POST /admin/bookings/:id/cancel
```

## Calendar

```
GET    /admin/calendar
POST   /admin/calendar/block
PATCH  /admin/calendar/block/:id
```

## Rooms

```
GET    /admin/rooms
POST   /admin/rooms
PATCH  /admin/rooms/:id
```

## Rates

```
GET    /admin/rates
PATCH  /admin/rates
POST   /admin/rates/bulk-update
```

## Payments

```
GET    /admin/payments
PATCH  /admin/payments/:id
POST   /admin/payments/:id/refund
```

## Housekeeping

```
GET    /admin/housekeeping
PATCH  /admin/housekeeping/:roomId
```

## Reports

```
GET /admin/reports/revenue
GET /admin/reports/occupancy
GET /admin/reports/payments
```

## Settings

```
GET    /admin/settings
PATCH  /admin/settings
```

---

# Deliverables

For **every module**, implement:

1. Database Changes (if needed)
2. API Routes
3. Controllers
4. Services
5. Validation
6. UI Components
7. Pages
8. State Management
9. Error Handling
10. Audit Logging
11. Unit Tests
12. Integration Tests
13. Documentation

---

# Development Strategy

Do **NOT** generate the entire project at once.

Implement one module at a time.

Recommended order:

1. Admin Shell
2. Dashboard
3. Booking Management
4. Calendar
5. Rooms
6. Rates
7. Packages
8. Payments
9. Guest CRM
10. Housekeeping
11. Maintenance
12. Reports
13. Staff
14. Settings
15. Audit Logs

After completing each module:

- Verify functionality
- Ensure production quality
- Wait for approval before continuing

---

# Success Criteria

The final system should:

- Be production-ready
- Be secure
- Be scalable
- Follow enterprise architecture
- Preserve the existing authentication system
- Preserve RBAC
- Preserve audit logging
- Use reusable components
- Maintain clean code standards
- Provide a modern, intuitive experience for resort owners and staff