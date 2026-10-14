// Plain code, quick to run: tests can use the real one
class Menu {
  price(drink) {
    const prices = { espresso: 3, latte: 4 };
    return prices[drink];
  }
}

class Promotions {
  // In the app, it asks the head office for today's discount
  discountToday() {
    throw new Error("No head office in tests");
  }
}

class OrderBook {
  // In the app, it keeps the orders in a database
  save(orderId, total) {
    throw new Error(`No database in tests (order ${orderId}: ${total})`);
  }

  total(orderId) {
    throw new Error(`No database in tests (order ${orderId})`);
  }
}

class Kitchen {
  // In the app, it prints a ticket for the barista
  printTicket(orderId, drinks) {
    throw new Error(`No printer in tests (order ${orderId}: ${drinks})`);
  }
}

class Cafe {
  constructor(menu, promotions, orders, kitchen) {
    this.menu = menu;
    this.promotions = promotions;
    this.orders = orders;
    this.kitchen = kitchen;
  }

  order(orderId, drinks) {
    let total = 0;
    for (const drink of drinks) {
      total += this.menu.price(drink);
    }
    total -= this.promotions.discountToday();
    this.orders.save(orderId, total);
    this.kitchen.printTicket(orderId, drinks);
    return total;
  }
}

module.exports = { Menu, Promotions, OrderBook, Kitchen, Cafe };
