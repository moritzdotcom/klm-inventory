// lib/models/waiterSettlement.ts

export type SettlementCalculationItem = {
  quantity: number;
  unitPriceCents: number;
};

export function calculateWaiterSettlement(
  items: SettlementCalculationItem[],
  prepaidMinimumSpendCents: number,
  cashRevenueCents = 0,
  cardRevenueCents = 0,
) {
  const issuedQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const issuedTotalCents = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );

  const collectedTotalCents =
    prepaidMinimumSpendCents + cashRevenueCents + cardRevenueCents;

  const balanceCents = collectedTotalCents - issuedTotalCents;

  return {
    issuedQuantity,
    issuedTotalCents,
    collectedTotalCents,

    // Positiv: Geld ist übrig.
    // Negativ: Betrag fehlt noch.
    balanceCents,

    surplusCents: Math.max(0, balanceCents),
    missingCents: Math.max(0, -balanceCents),
  };
}
