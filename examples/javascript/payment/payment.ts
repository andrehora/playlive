export interface ChargeRequest {
  amountCents: number;
  currency: string;
}

// Theirs: a payment library. Its API is not yours to change
export class PayCo {
  createCharge(request: ChargeRequest): { status: string } {
    throw new Error(`PayCo is not reachable from tests (${request.currency})`);
  }
}

// Ours: the only code that knows PayCo. Tests mock this
export class Payments {
  constructor(private payco: PayCo) {}

  // A change to try: PayCo renames createCharge. Only this and the bad test change
  charge(euros: number): boolean {
    const reply = this.payco.createCharge({ amountCents: euros * 100, currency: "EUR" });
    return reply.status === "succeeded";
  }
}

export function checkout(total: number, payments: Payments): string {
  if (total <= 0) {
    throw new Error("Nothing to pay");
  }
  if (payments.charge(total)) {
    return "Paid";
  }
  return "Declined";
}
