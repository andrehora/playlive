function isPalindrome(text) {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  return letters === [...letters].reverse().join("");
}

module.exports = { isPalindrome };
