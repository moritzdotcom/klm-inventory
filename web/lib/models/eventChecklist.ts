// lib/events/eventChecklist.ts

export type EventChecklist = {
  openingStock: boolean;
  employeeDrinks: boolean;
  waiterSettlement: boolean;
  closingStock: boolean;
};

export type EventChecklistKey = keyof EventChecklist;

export function getEventChecklist(input: {
  inventory: {
    openingCompletedAt: Date | null;
    employeeDrinksCompletedAt: Date | null;
    closingCompletedAt: Date | null;
  } | null;
  settlement: {
    closedAt: Date | null;
  } | null;
}): EventChecklist {
  return {
    openingStock: Boolean(input.inventory?.openingCompletedAt),
    employeeDrinks: Boolean(input.inventory?.employeeDrinksCompletedAt),
    waiterSettlement: Boolean(input.settlement?.closedAt),
    closingStock: Boolean(input.inventory?.closingCompletedAt),
  };
}

export function getEventChecklistProgress(checklist: EventChecklist) {
  const values = Object.values(checklist);

  return {
    completed: values.filter(Boolean).length,
    total: values.length,
    done: values.every(Boolean),
  };
}
