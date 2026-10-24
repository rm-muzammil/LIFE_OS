export function pkr(amount: number): string {
  return `₨${Math.round(amount).toLocaleString('en-PK')}`;
}
