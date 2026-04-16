export const PET_COLOR_PALETTE = [
  '#1565c0', '#c62828', '#00796b', '#6a1b9a',
  '#bf360c', '#2e7d32', '#4527a0', '#00565f',
  '#33691e', '#ad1457', '#4e342e', '#37474f',
  '#0277bd', '#6d4c41', '#283593', '#00695c',
];

export function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? '#1a2332' : '#fff';
}
