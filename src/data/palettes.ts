// Colours pulled from things every Bengali has seen at puja time.
// bg = ground colour, ink = text on bg, accent = highlight, deep = shadows/outlines.

export interface Palette {
  bg: string;
  ink: string;
  accent: string;
  deep: string;
  soft: string;
}

export const palettes = {
  sindoor: { bg: '#b3261e', ink: '#fff4e0', accent: '#f2b632', deep: '#5c0f0b', soft: '#e8644f' },
  haldi: { bg: '#efb128', ink: '#3a1d0e', accent: '#b3261e', deep: '#6b3a0b', soft: '#f7d77a' },
  lalpaar: { bg: '#fbf3e4', ink: '#2b1a10', accent: '#c0281f', deep: '#7a1712', soft: '#f1dcc0' },
  neel: { bg: '#1f2a5a', ink: '#fbe9c8', accent: '#f2b632', deep: '#0d1433', soft: '#3d4c8c' },
  shiuli: { bg: '#fff6e6', ink: '#3a2a1a', accent: '#e8731c', deep: '#8a3c0a', soft: '#fbd9b0' },
  kolapata: { bg: '#2f5d3a', ink: '#fbf0d6', accent: '#e9b23a', deep: '#14301c', soft: '#5e8f63' },
  terracotta: { bg: '#b5562f', ink: '#fbe7d0', accent: '#f6c56b', deep: '#4a1f0f', soft: '#d9895f' },
  ganga: { bg: '#2c6e7a', ink: '#fdf3df', accent: '#f4b63f', deep: '#123a42', soft: '#7fb3b5' },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;
