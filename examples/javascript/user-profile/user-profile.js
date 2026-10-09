function makeProfile(name, email) {
  name = name.trim();
  if (!name) {
    throw new Error("Name is required");
  }
  // avatar came later: avatar: "default.png"
  return { name, email: email.toLowerCase() };
}

module.exports = { makeProfile };
