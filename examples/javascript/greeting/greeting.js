const clock = {
  hour() {
    return new Date().getHours();
  },
};

function greet(name) {
  const hour = clock.hour();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

module.exports = { clock, greet };
