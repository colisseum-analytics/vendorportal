const CATEGORY_COLORS = ['#3C6E8F', '#D89A2E', '#4C7A54', '#B14A3D', '#7A5C9E', '#3C8F84']

export function colorForCategory(categories, cat) {
  const idx = categories.indexOf(cat)
  return CATEGORY_COLORS[(idx >= 0 ? idx : cat.length) % CATEGORY_COLORS.length]
}
