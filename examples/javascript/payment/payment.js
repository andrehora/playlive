// Theirs: a payment library you installed. Its API is not yours to change
class PayCo {
  createCharge(request) {
    throw new Error(`PayCo is not reachable from tests (${request.currency})`);
  }
}

// Ours: the one place that knows PayCo's API. Tests mock this, not PayCo
class Payments {
  constructor(payco) {
    this.payco = payco;
  }

  // A change to try: PayCo renames createCharge to makeCharge. Only this
  // method and the bad test have to change
  charge(euros) {
    const reply = this.payco.createCharge({ amountCents: euros * 100, currency: "EUR" });
    return reply.status === "succeeded";
  }
}

function checkout(total, payments) {
  if (total <= 0) {
    throw new Error("Nothing to pay");
  }
  if (payments.charge(total)) {
    return "Paid";
  }
  return "Declined";
}

module.exports = { PayCo, Payments, checkout };
