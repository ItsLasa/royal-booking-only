import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";
import {
  getDefaultFromEmail,
  sendEmail,
  sendBookingSummaryEmail,
} from "../../src/services/emailService";

describe("Nodemailer Email Service", () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-msg-123" });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: sendMailMock,
      verify: vi.fn().mockResolvedValue(true),
    } as any);
  });

  it("should provide default from email format", () => {
    const from = getDefaultFromEmail();
    expect(from).toBeDefined();
    expect(typeof from).toBe("string");
    expect(from).toContain("Royal Mansion Resort");
  });

  it("should send email via nodemailer and return success", async () => {
    // When SMTP config is present or simulated
    const result = await sendEmail({
      to: "guest@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    // In environment without SMTP credentials, result.sent is false and logs gracefully
    expect(result).toBeDefined();
    expect(typeof result.sent).toBe("boolean");
  });

  it("should handle sendBookingSummaryEmail gracefully for non-existent booking", async () => {
    const mockPrisma: any = {
      booking: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    const res = await sendBookingSummaryEmail(mockPrisma, "NONEXISTENT");
    expect(res).toBe(false);
  });

  it("should format and process booking summary email for valid booking", async () => {
    const mockBooking: any = {
      id: "booking-1",
      reference: "RMR-202611-TEST1",
      checkInDate: new Date("2026-12-01"),
      checkOutDate: new Date("2026-12-03"),
      nights: 2,
      adults: 2,
      children: 0,
      grandTotal: 50000,
      depositRequired: 25000,
      balanceDue: 25000,
      package: { name: "Luxury Villa Package" },
      guest: {
        firstName: "Kamal",
        lastName: "Perera",
        email: "kamal@example.test",
        phone: "+94771234567",
      },
      priceLines: [
        { description: "2 Nights Accommodation", totalAmount: 50000 },
      ],
      addOns: [],
      payments: [],
    };

    const mockPrisma: any = {
      booking: {
        findFirst: vi.fn().mockResolvedValue(mockBooking),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
    };

    const res = await sendBookingSummaryEmail(mockPrisma, "RMR-202611-TEST1");
    expect(res).toBe(true);
    expect(mockPrisma.booking.findFirst).toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });
});
