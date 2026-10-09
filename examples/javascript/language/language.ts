// The app's settings, shared by every part of it
export const settings = { language: "en" };

export function greet(name: string): string {
  if (settings.language === "pt") {
    return "Olá, " + name;
  }
  return "Hello, " + name;
}
