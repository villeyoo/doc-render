const FONT_CLASS_FALLBACK = 'default'

export function normalizeHexColor(value: string) {
  const raw = value.trim().replace(/^#/, '').toUpperCase()

  if (raw.length === 3) {
    return raw
      .split('')
      .map((part) => part + part)
      .join('')
  }

  if (/^[0-9A-F]{6}$/.test(raw)) {
    return raw
  }

  return raw.padStart(6, '0').slice(0, 6)
}

export function fontClassNameFromFont(font: string) {
  const normalized = font
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || FONT_CLASS_FALLBACK
}

export function googleFontsFamilyParam(font: string) {
  return encodeURIComponent(font.trim()).replace(/%20/g, '+')
}

export const DOC_FONT_FALLBACK =
  "'Open Sans', 'Segoe UI', system-ui, sans-serif"
