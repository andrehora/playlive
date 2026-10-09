// Ours: the pricing rule, which tests should run for real
export const pricing = {
  total(items: [number, number][], coupon: string): number {
    let subtotal = 0;
    for (const [price, count] of items) subtotal += price * count;
    if (coupon === "SAVE10") {
      subtotal -= 10;
    }
    return subtotal;
  },
};

// System boundaries: the real ones charge cards and send email, so tests mock them
export class Gateway {
  charge(amount: number): void {
    throw new Error(`No payment gateway in tests (${amount})`);
  }
}

export class Mailer {
  send(to: string, text: string): void {
    throw new Error(`No mail server in tests (${to}: ${text})`);
  }
}

export function placeOrder(email: string, items: [number, number][], coupon: string, gateway: Gateway, mailer: Mailer): number {
  // A bug to try: const amount = pricing.total(items, "");
  const amount = pricing.total(items, coupon);
  if (amount <= 0) {
    throw new Error("Nothing to pay");
  }
  gateway.charge(amount);
  mailer.send(email, "Order confirmed: " + amount);
  return amount;
}
