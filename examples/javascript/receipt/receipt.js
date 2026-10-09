function receipt(items) {
  // A change to try: const lines = ["Thanks for shopping"];
  const lines = [];
  let total = 0;
  for (const [name, price] of items) {
    lines.push(name + ": " + price);
    total += price;
  }
  lines.push("Total: " + total);
  return lines;
}

module.exports = { receipt };
