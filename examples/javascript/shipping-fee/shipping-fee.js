function shippingFee(total, express) {
  let fee = 5;
  if (total >= 50) {
    fee = 0;
  }
  if (express) {
    // A bug to try: fee -= 10;
    fee += 10;
  }
  return fee;
}

module.exports = { shippingFee };
