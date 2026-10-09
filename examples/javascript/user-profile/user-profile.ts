export interface Profile {
  name: string;
  email: string;
}

export function makeProfile(name: string, email: string): Profile {
  name = name.trim();
  if (!name) {
    throw new Error("Name is required");
  }
  // A change to try: add avatar: "default.png"
  return { name, email: email.toLowerCase() };
}
