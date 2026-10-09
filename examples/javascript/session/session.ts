const USERS: Record<string, string> = { ana: "secret1", ben: "secret2" };

// Shared by every caller: who is logged in lives as long as the program does
const session = { user: "" };

export function login(name: string, password: string): void {
  if (USERS[name] !== password) {
    throw new Error("Wrong name or password");
  }
  session.user = name;
}

export function logout(): void {
  session.user = "";
}

export function currentUser(): string {
  if (!session.user) {
    throw new Error("No one is logged in");
  }
  return session.user;
}

export function greeting(): string {
  // A change to try: return "Welcome back, " + currentUser();
  return "Hello, " + currentUser();
}
