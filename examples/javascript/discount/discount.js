// 10% off from 100
function discounted(price) {
  // A bug to try: if (price > 100) {
  if (price >= 100) {
    return price * 90 / 100;
  }
  return price;
}

module.exports = { discounted };
