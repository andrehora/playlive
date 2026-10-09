class SignUp {
  constructor(users) {
    this.users = users;
  }

  register(email) {
    if (this.users.exists(email)) {
      throw new Error("Email already registered");
    }
    // A bug to try: move this line above the if
    this.users.save(email);
    return "Welcome, " + email;
  }
}

module.exports = { SignUp };
