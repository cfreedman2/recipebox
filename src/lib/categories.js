export const DEFAULT_CATEGORIES = [
  'Poultry',
  'Beef',
  'Lamb',
  'Fish',
  'Salads',
  'Soups',
  'Desserts',
  'Pasta',
  'Sides',
  'Breakfast',
]

export function mergeCategories(existing = []) {
  return [...new Set([...DEFAULT_CATEGORIES, ...existing])].sort()
}
