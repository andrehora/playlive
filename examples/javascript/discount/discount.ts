// 10% off from 100
export function discounted(price: number): number {
  // A bug to try: if (price > 100) {
  if (price >= 100) {
    return price * 90 / 100;
  }
  return price;
}
