export interface ChargeRequest {
  amountCents: number;
  currency: string;
}

// Theirs: a payment library you installed. Its API is not yours to change
export class PayCo {
  createCharge(request: ChargeRequest): { status: string } {
    throw new Error(`PayCo is not reachable from tests (${request.currency})`);
  }
}

// Ours: the one place that knows PayCo's API. Tests mock this, not PayCo
export class Payments {
  constructor(private payco: PayCo) {}

  // A change to try: PayCo renames createCharge to makeCharge. Only this
  // method and the bad test have to change
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
