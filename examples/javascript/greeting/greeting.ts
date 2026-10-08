export const clock = {
  hour(): number {
    return new Date().getHours();
  },
};

export function greet(name: string): string {
  const hour = clock.hour();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}
