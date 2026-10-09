// A point per euro, doubled for members, 50 more on a birthday, 500 at most
function loyaltyPoints(amount, member, birthday) {
  if (amount < 0) {
    throw new Error("Amount cannot be negative");
  }
  let points = amount;
  if (member) {
    points = points * 2;
  }
  if (birthday) {
    // A bug to try: points += 5;
    points += 50;
  }
  if (points > 500) {
    points = 500;
  }
  return points;
}

module.exports = { loyaltyPoints };
