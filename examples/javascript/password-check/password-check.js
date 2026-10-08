function isStrong(password) {
  return (
    password.length >= 8 &&
    /[0-9]/.test(password) &&
    /[A-Z]/.test(password)
  );
}

module.exports = { isStrong };
