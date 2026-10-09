const USERS = { ana: "secret1", ben: "secret2" };

// Shared by every caller: who is logged in lives as long as the program does
const session = { user: "" };

function login(name, password) {
  if (USERS[name] !== password) {
    throw new Error("Wrong name or password");
  }
  session.user = name;
}

function logout() {
  session.user = "";
}

function currentUser() {
  if (!session.user) {
    throw new Error("No one is logged in");
  }
  return session.user;
}

function greeting() {
  // A change to try: return "Welcome back, " + currentUser();
  return "Hello, " + currentUser();
}

module.exports = { login, logout, currentUser, greeting };
