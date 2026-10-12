const MENU: Record<string, number> = { soup: 4, salad: 6, steak: 15 };

export function dishes(): string[] {
  return Object.keys(MENU);
}

export function priceOf(dish: string): number | undefined {
  return MENU[dish];
}
