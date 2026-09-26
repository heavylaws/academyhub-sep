import { describe, expect, it } from "vitest";

interface FeeStatusArgs {
  amount: number;
  paidAmount: number;
  dueDate: string;
  referenceDate?: string;
}

export function calculateFeeStatus({
  amount,
  paidAmount,
  dueDate,
  referenceDate = new Date().toISOString().split("T")[0],
}: FeeStatusArgs): "paid" | "partial" | "overdue" | "pending" {
  if (amount <= 0) return "paid";
  if (paidAmount >= amount) return "paid";
  if (paidAmount > 0) return "partial";
  if (dueDate < referenceDate) return "overdue";
  return "pending";
}

export function applyPayment(
  currentBalance: number,
  paymentAmount: number,
): { newBalance: number; recordedPayment: number; overpayment: number } {
  if (paymentAmount <= 0) {
    return { newBalance: currentBalance, recordedPayment: 0, overpayment: 0 };
  }
  if (paymentAmount > currentBalance) {
    return {
      newBalance: 0,
      recordedPayment: currentBalance,
      overpayment: Number((paymentAmount - currentBalance).toFixed(2)),
    };
  }
  const newBalance = Number((currentBalance - paymentAmount).toFixed(2));
  return { newBalance, recordedPayment: paymentAmount, overpayment: 0 };
}

export function formatInvoiceNumber(num: number): string {
  return `INV-${String(num).padStart(4, "0")}`;
}

describe("Finance Business Logic & Edge Cases Suite", () => {
  describe("Fee & Invoice Status Evaluation", () => {
    const today = "2026-09-07";

    it("evaluates fully paid fees as 'paid'", () => {
      expect(calculateFeeStatus({ amount: 150, paidAmount: 150, dueDate: "2026-09-01", referenceDate: today })).toBe("paid");
      expect(calculateFeeStatus({ amount: 150, paidAmount: 200, dueDate: "2026-09-01", referenceDate: today })).toBe("paid");
    });

    it("evaluates partial payments as 'partial' even if past due date", () => {
      expect(calculateFeeStatus({ amount: 200, paidAmount: 50, dueDate: "2026-08-15", referenceDate: today })).toBe("partial");
      expect(calculateFeeStatus({ amount: 200, paidAmount: 199.99, dueDate: "2026-08-15", referenceDate: today })).toBe("partial");
    });

    it("flags unpaid fees with past due date as 'overdue'", () => {
      expect(calculateFeeStatus({ amount: 100, paidAmount: 0, dueDate: "2026-09-01", referenceDate: today })).toBe("overdue");
      expect(calculateFeeStatus({ amount: 250, paidAmount: 0, dueDate: "2026-08-31", referenceDate: today })).toBe("overdue");
    });

    it("marks unpaid fees with future due date as 'pending'", () => {
      expect(calculateFeeStatus({ amount: 100, paidAmount: 0, dueDate: "2026-09-15", referenceDate: today })).toBe("pending");
      expect(calculateFeeStatus({ amount: 300, paidAmount: 0, dueDate: today, referenceDate: today })).toBe("pending");
    });

    it("treats zero-dollar ($0) comped or scholarship fees as 'paid'", () => {
      expect(calculateFeeStatus({ amount: 0, paidAmount: 0, dueDate: "2026-08-01", referenceDate: today })).toBe("paid");
    });
  });

  describe("Partial & Overpayment Calculation Edge Cases", () => {
    it("deducts exact payment amount from balance", () => {
      const result = applyPayment(250, 100);
      expect(result.newBalance).toBe(150);
      expect(result.recordedPayment).toBe(100);
      expect(result.overpayment).toBe(0);
    });

    it("correctly handles decimal cents without floating point precision artifacts", () => {
      const result = applyPayment(99.99, 33.33);
      expect(result.newBalance).toBe(66.66);
      expect(result.recordedPayment).toBe(33.33);
      expect(result.overpayment).toBe(0);
    });

    it("safely handles overpayments by capping recorded payment and logging overpayment credit", () => {
      const result = applyPayment(120, 150);
      expect(result.newBalance).toBe(0);
      expect(result.recordedPayment).toBe(120);
      expect(result.overpayment).toBe(30);
    });

    it("safely rejects or ignores zero or negative payment attempts", () => {
      const resultZero = applyPayment(100, 0);
      expect(resultZero.newBalance).toBe(100);
      expect(resultZero.recordedPayment).toBe(0);

      const resultNegative = applyPayment(100, -50);
      expect(resultNegative.newBalance).toBe(100);
      expect(resultNegative.recordedPayment).toBe(0);
    });
  });

  describe("Sequential Invoice Formatting", () => {
    it("formats standard sequential invoice numbers with 4-digit padding", () => {
      expect(formatInvoiceNumber(1)).toBe("INV-0001");
      expect(formatInvoiceNumber(7)).toBe("INV-0007");
      expect(formatInvoiceNumber(42)).toBe("INV-0042");
      expect(formatInvoiceNumber(999)).toBe("INV-0999");
      expect(formatInvoiceNumber(1000)).toBe("INV-1000");
    });
  });
});
