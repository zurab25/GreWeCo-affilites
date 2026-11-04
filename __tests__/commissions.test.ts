import { describe, it, expect } from "vitest";
import {
  computeEarningsSummary,
  COMMISSION_RATES,
  type Commission,
} from "@/lib/commissions";

describe("COMMISSION_RATES", () => {
  it("should have correct commission rates", () => {
    expect(COMMISSION_RATES.first_sale).toBe(0.1);
    expect(COMMISSION_RATES.carbon).toBe(0.1);
    expect(COMMISSION_RATES.timber).toBe(0.05);
  });
});

describe("computeEarningsSummary", () => {
  it("should return zero summary for empty array", () => {
    const summary = computeEarningsSummary([]);
    expect(summary.totalPending).toBe(0);
    expect(summary.totalPaid).toBe(0);
    expect(summary.commissionCount).toBe(0);
  });

  it("should sum pending commissions correctly", () => {
    const commissions: Commission[] = [
      {
        id: "1",
        affiliateId: "user1",
        orderId: "order1",
        buyerId: null,
        orderAmountUsd: 100,
        commissionType: "first_sale",
        commissionRate: 0.1,
        commissionAmountUsd: 10,
        status: "pending",
        createdAt: new Date(),
        paidAt: null,
      },
      {
        id: "2",
        affiliateId: "user1",
        orderId: "order2",
        buyerId: null,
        orderAmountUsd: 200,
        commissionType: "first_sale",
        commissionRate: 0.1,
        commissionAmountUsd: 20,
        status: "pending",
        createdAt: new Date(),
        paidAt: null,
      },
    ];

    const summary = computeEarningsSummary(commissions);
    expect(summary.totalPending).toBe(30);
    expect(summary.totalPaid).toBe(0);
    expect(summary.pendingByType.first_sale).toBe(30);
    expect(summary.commissionCount).toBe(2);
  });

  it("should separate paid from pending", () => {
    const commissions: Commission[] = [
      {
        id: "1",
        affiliateId: "user1",
        orderId: "order1",
        buyerId: null,
        orderAmountUsd: 100,
        commissionType: "first_sale",
        commissionRate: 0.1,
        commissionAmountUsd: 10,
        status: "paid",
        createdAt: new Date(),
        paidAt: new Date(),
      },
      {
        id: "2",
        affiliateId: "user1",
        orderId: "order2",
        buyerId: null,
        orderAmountUsd: 200,
        commissionType: "first_sale",
        commissionRate: 0.1,
        commissionAmountUsd: 20,
        status: "pending",
        createdAt: new Date(),
        paidAt: null,
      },
    ];

    const summary = computeEarningsSummary(commissions);
    expect(summary.totalPending).toBe(20);
    expect(summary.totalPaid).toBe(10);
  });

  it("should exclude cancelled commissions from count", () => {
    const commissions: Commission[] = [
      {
        id: "1",
        affiliateId: "user1",
        orderId: "order1",
        buyerId: null,
        orderAmountUsd: 100,
        commissionType: "first_sale",
        commissionRate: 0.1,
        commissionAmountUsd: 10,
        status: "cancelled",
        createdAt: new Date(),
        paidAt: null,
      },
      {
        id: "2",
        affiliateId: "user1",
        orderId: "order2",
        buyerId: null,
        orderAmountUsd: 200,
        commissionType: "first_sale",
        commissionRate: 0.1,
        commissionAmountUsd: 20,
        status: "pending",
        createdAt: new Date(),
        paidAt: null,
      },
    ];

    const summary = computeEarningsSummary(commissions);
    expect(summary.commissionCount).toBe(1);
    expect(summary.totalPending).toBe(20);
  });

  it("should track pending by commission type", () => {
    const commissions: Commission[] = [
      {
        id: "1",
        affiliateId: "user1",
        orderId: "order1",
        buyerId: null,
        orderAmountUsd: 100,
        commissionType: "first_sale",
        commissionRate: 0.1,
        commissionAmountUsd: 10,
        status: "pending",
        createdAt: new Date(),
        paidAt: null,
      },
      {
        id: "2",
        affiliateId: "user1",
        orderId: null,
        buyerId: null,
        orderAmountUsd: 500,
        commissionType: "carbon",
        commissionRate: 0.1,
        commissionAmountUsd: 50,
        status: "pending",
        createdAt: new Date(),
        paidAt: null,
      },
      {
        id: "3",
        affiliateId: "user1",
        orderId: null,
        buyerId: null,
        orderAmountUsd: 1000,
        commissionType: "timber",
        commissionRate: 0.05,
        commissionAmountUsd: 50,
        status: "pending",
        createdAt: new Date(),
        paidAt: null,
      },
    ];

    const summary = computeEarningsSummary(commissions);
    expect(summary.pendingByType.first_sale).toBe(10);
    expect(summary.pendingByType.carbon).toBe(50);
    expect(summary.pendingByType.timber).toBe(50);
    expect(summary.totalPending).toBe(110);
  });
});
