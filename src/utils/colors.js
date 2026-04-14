/**
 * Curated color palettes for celestial object types.
 */

export const PALETTES = {
  star: [
    { hex: 0xFFD93D, css: '#FFD93D' },
    { hex: 0xFFA94D, css: '#FFA94D' },
    { hex: 0xFF6B6B, css: '#FF6B6B' },
    { hex: 0xE8DAFF, css: '#E8DAFF' },
    { hex: 0x74B9FF, css: '#74B9FF' },
    { hex: 0xFDCB6E, css: '#FDCB6E' },
  ],
  planet: [
    { hex: 0x4ECDC4, css: '#4ECDC4' },
    { hex: 0x3498DB, css: '#3498DB' },
    { hex: 0x6C5CE7, css: '#6C5CE7' },
    { hex: 0x00B894, css: '#00B894' },
    { hex: 0xE17055, css: '#E17055' },
    { hex: 0x55A6E8, css: '#55A6E8' },
    { hex: 0xD4A373, css: '#D4A373' },
    { hex: 0x81ECEC, css: '#81ECEC' },
  ],
  asteroid: [
    { hex: 0x95A5A6, css: '#95A5A6' },
    { hex: 0x7F8C8D, css: '#7F8C8D' },
    { hex: 0xB2BEC3, css: '#B2BEC3' },
    { hex: 0x8B7355, css: '#8B7355' },
    { hex: 0x636E72, css: '#636E72' },
  ],
  blackhole: [
    { hex: 0x9B59B6, css: '#9B59B6' },
    { hex: 0x8E44AD, css: '#8E44AD' },
    { hex: 0x6C3483, css: '#6C3483' },
  ],
};

/** CSS accent color per type (for UI elements) */
export const TYPE_ACCENT = {
  star:      '#FFD93D',
  planet:    '#4ECDC4',
  asteroid:  '#95A5A6',
  blackhole: '#9B59B6',
};

/** Glow config per type */
export const TYPE_GLOW = {
  star:      { intensity: 2.0, radius: 3.0 },
  planet:    { intensity: 0.1, radius: 0.5 },
  asteroid:  { intensity: 0.0, radius: 0.0 },
  blackhole: { intensity: 1.5, radius: 4.0 },
};

/** Pick a random color from a type's palette */
export function randomColorForType(type) {
  const palette = PALETTES[type] || PALETTES.asteroid;
  return palette[Math.floor(Math.random() * palette.length)];
}

/** Trail color — transparent version of body color */
export function trailColor(cssHex, alpha = 0.4) {
  if (!cssHex || !cssHex.startsWith('#')) return `rgba(150,150,150,${alpha})`;
  const r = parseInt(cssHex.slice(1, 3), 16);
  const g = parseInt(cssHex.slice(3, 5), 16);
  const b = parseInt(cssHex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
