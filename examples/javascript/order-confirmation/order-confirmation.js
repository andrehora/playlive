// Ours: the pricing rule, which tests should run for real
const pricing = {
  total(items, coupon) {
    let subtotal = 0;
    for (const [price, count] of items) subtotal += price * count;
    if (coupon === "SAVE10") {
      subtotal -= 10;
    }
    return subtotal;
  },
};

// System boundaries: the real ones charge cards and send email, so tests mock them
class Gateway {
  charge(amount) {
    throw new Error(`No payment gateway in tests (${amount})`);
  }
}

class Mailer {
  send(to, text) {
    throw new Error(`No mail server in tests (${to}: ${text})`);
  }
}

function placeOrder(email, items, coupon, gateway, mailer) {
  // A bug to try: const amount = pricing.total(items, "");
  const amount = pricing.total(items, coupon);
  if (amount <= 0) {
    throw new Error("Nothing to pay");
  }
  gateway.charge(amount);
  mailer.send(email, "Order confirmed: " + amount);
  return amount;
}

module.exports = { pricing, Gateway, Mailer, placeOrder };
