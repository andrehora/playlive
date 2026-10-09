function draw(names, rand = Math.random) {
  if (!names.length) {
    throw new Error("No one entered");
  }
  // A bug to try: return names[Math.floor(rand() * (names.length - 1))];
  return names[Math.floor(rand() * names.length)];
}

module.exports = { draw };
