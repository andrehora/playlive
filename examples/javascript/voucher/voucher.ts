export function isExpired(expires: Date, today?: Date): boolean {
  if (today === undefined) {
    today = new Date();
  }
  // A bug to try: return today >= expires;
  return today > expires;
}
