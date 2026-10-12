function parse(text) {
  return text.split(", ");
}

function summary(items) {
  return { count: items.length, first: items[0] };
}

module.exports = { parse, summary };
