const MENU = { soup: 4, salad: 6, steak: 15 };

function dishes() {
  return Object.keys(MENU);
}

function priceOf(dish) {
  return MENU[dish];
}

module.exports = { dishes, priceOf };
