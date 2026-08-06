/**
 * Predefined taste-profile tags (Content.md §2.4). Single source of truth —
 * exposed to the frontend via GET /api/meta/taste-tags and used to validate
 * profile updates server-side.
 */
export const TASTE_TAGS = [
  'spicy',
  'vegetarian',
  'vegan',
  'sweet-tooth',
  'seafood',
  'halal',
  'street-food',
  'fine-dining',
  'healthy',
  'dessert',
];

export const TASTE_TAG_SET = new Set(TASTE_TAGS);
