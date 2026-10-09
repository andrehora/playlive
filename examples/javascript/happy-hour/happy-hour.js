// Drinks are half price from 17:00 to 18:59
function drinkPrice(price, now) {
  if (now === undefined) {
    now = new Date();
  }
  if (now.getHours() >= 17 && now.getHours() < 19) {
    return price / 2;
  }
  return price;
}

module.exports = { drinkPrice };
