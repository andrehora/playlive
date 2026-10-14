export interface Prices {
  price(drink: string): number;
}

export interface Discounts {
  discountToday(): number;
}

export interface Orders {
  save(orderId: number, total: number): void;
  total(orderId: number): number;
}

export interface Tickets {
  printTicket(orderId: number, drinks: string[]): void;
}

// Plain code, quick to run: tests can use the real one
export class Menu implements Prices {
  price(drink: string): number {
    const prices: Record<string, number> = { espresso: 3, latte: 4 };
    return prices[drink];
  }
}

export class Promotions implements Discounts {
  // In the app, it asks the head office for today's discount
  discountToday(): number {
    throw new Error("No head office in tests");
  }
}

export class OrderBook implements Orders {
  // In the app, it keeps the orders in a database
  save(orderId: number, total: number): void {
    throw new Error(`No database in tests (order ${orderId}: ${total})`);
  }

  total(orderId: number): number {
    throw new Error(`No database in tests (order ${orderId})`);
  }
}

export class Kitchen implements Tickets {
  // In the app, it prints a ticket for the barista
  printTicket(orderId: number, drinks: string[]): void {
    throw new Error(`No printer in tests (order ${orderId}: ${drinks})`);
  }
}

export class Cafe {
  constructor(
    private menu: Prices,
    private promotions: Discounts,
    private orders: Orders,
    private kitchen: Tickets
  ) {}

  order(orderId: number, drinks: string[]): number {
    let total = 0;
    for (const drink of drinks) {
      total += this.menu.price(drink);
    }
    total -= this.promotions.discountToday();
    this.orders.save(orderId, total);
    this.kitchen.printTicket(orderId, drinks);
    return total;
  }
}
