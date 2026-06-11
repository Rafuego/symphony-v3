// v2 request-type display helpers.
//
// Data-level decision (locked): request_type is relabel-only, no row rewrites.
//   - Existing stored ids (brand, site, deck, product, marketing, misc) all stay valid.
//   - 'site' is DISPLAYED as "Web" but still STORED as 'site' (no new id, no data change).
//   - 'animation' is the only genuinely new id (CHECK widened in migration 013).
//   - 'product' and 'misc' remain renderable for old rows but are hidden from the create form.
//
// This file is the SINGLE place the site->Web relabel lives.

import { requestTypes } from '@/lib/supabase'

// Display metadata for every id that can appear on a request, including legacy ones.
export const typeDisplay = {
  brand: { label: 'Brand', emoji: '🎨' },
  site: { label: 'Web', emoji: '🌐' }, // stored as 'site', shown as "Web"
  deck: { label: 'Deck', emoji: '📊' },
  product: { label: 'Product', emoji: '📱' }, // legacy, display-only
  marketing: { label: 'Marketing', emoji: '📣' },
  misc: { label: 'Misc', emoji: '📁' }, // legacy, display-only
  animation: { label: 'Animation/Motion', emoji: '▶️' },
}

// Order shown in the create-request form (matches the Figma toggle order).
// Note: "Web" maps to the stored id 'site'.
export const createableTypeIds = ['marketing', 'brand', 'site', 'deck', 'animation']

// Ids kept renderable for existing requests but never offered in the create form.
export const legacyTypeIds = ['product', 'misc']

export function getTypeMeta(id) {
  return typeDisplay[id] || { label: id || 'Misc', emoji: '📁' }
}

// Options for the create form: [{ id, label, emoji }]
export const createableTypes = createableTypeIds.map((id) => ({
  id,
  ...getTypeMeta(id),
}))

// Sanity: every id in lib/supabase requestTypes has display metadata.
// (requestTypes is still the source of truth for legacy validation elsewhere.)
export const allKnownTypeIds = [
  ...requestTypes.map((t) => t.id),
  'animation',
]
