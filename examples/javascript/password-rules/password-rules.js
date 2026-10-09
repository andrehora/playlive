function strength(password) {
  if (password.length < 8) {
    return "weak";
  }
  if (/^[a-z]+$/i.test(password)) {
    // A bug to try: return "weak";
    return "medium";
  }
  return "strong";
}

module.exports = { strength };
