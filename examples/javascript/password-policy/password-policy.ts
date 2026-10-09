export class PasswordPolicy {
  constructor(private minLength = 8) {}

  problems(password: string): string[] {
    const found: string[] = [];
    if (password.length < this.minLength) {
      found.push("too short");
    }
    if (!this.hasDigit(password)) {
      found.push("no digit");
    }
    if (password.toLowerCase() === password) {
      found.push("no capital");
    }
    return found;
  }

  isValid(password: string): boolean {
    return this.problems(password).length === 0;
  }

  // Private: callers cannot reach it
  // A change to try: inline hasDigit into problems, and remove it
  private hasDigit(password: string): boolean {
    return /\d/.test(password);
  }
}
