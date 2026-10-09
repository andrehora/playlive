export interface Users {
  exists(email: string): boolean;
  save(email: string): void;
}

export class SignUp {
  constructor(private users: Users) {}

  register(email: string): string {
    if (this.users.exists(email)) {
      throw new Error("Email already registered");
    }
    // A bug to try: move this line above the if
    this.users.save(email);
    return "Welcome, " + email;
  }
}
