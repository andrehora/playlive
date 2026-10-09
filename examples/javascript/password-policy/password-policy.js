class PasswordPolicy {
  constructor(minLength = 8) {
    this.minLength = minLength;
  }

  problems(password) {
    const found = [];
    if (password.length < this.minLength) {
      found.push("too short");
    }
    if (!this._hasDigit(password)) {
      found.push("no digit");
    }
    if (password.toLowerCase() === password) {
      found.push("no capital");
    }
    return found;
  }

  isValid(password) {
    return this.problems(password).length === 0;
  }

  // Private: the leading _ says it is not for callers
  // A change to try: inline _hasDigit into problems, and remove it
  _hasDigit(password) {
    return /\d/.test(password);
  }
}

module.exports = { PasswordPolicy };
