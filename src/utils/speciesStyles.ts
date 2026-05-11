export const SPECIES_AVATAR_BG: Record<string, string> = {
  cat:    '#ede9fe',
  dog:    '#fce7f3',
  rabbit: '#d1fae5',
  bird:   '#fffbeb',
  fish:   '#f0f9ff',
  other:  '#f0f4ff',
};

export const SPECIES_TAG_GRADIENT: Record<string, string> = {
  cat:    'linear-gradient(135deg, #6c63ff, #a78bfa)',
  dog:    'linear-gradient(135deg, #fb7185, #f9a8d4)',
  rabbit: 'linear-gradient(135deg, #34d399, #6ee7b7)',
  bird:   'linear-gradient(135deg, #fbbf24, #fde68a)',
  fish:   'linear-gradient(135deg, #38bdf8, #7dd3fc)',
  other:  'linear-gradient(135deg, #a78bfa, #c4b5fd)',
};

export const SPECIES_TAG_COLOR: Record<string, string> = {
  cat:    'white',
  dog:    'white',
  rabbit: '#064e3b',
  bird:   '#451a03',
  fish:   '#0c4a6e',
  other:  'white',
};

export const SPECIES_ICON_COLOR: Record<string, string> = {
  cat:    '#6c63ff',
  dog:    '#fb7185',
  rabbit: '#34d399',
  bird:   '#fbbf24',
  fish:   '#38bdf8',
  other:  '#a78bfa',
};

export const SPECIES_PLACEHOLDER_IMG: Record<string, string> = {
  dog:    new URL('../assets/placeholder-dog.svg', import.meta.url).href,
  cat:    new URL('../assets/placeholder-cat.svg', import.meta.url).href,
  rabbit: new URL('../assets/placeholder-rabbit.svg', import.meta.url).href,
  bird:   new URL('../assets/placeholder-bird.svg', import.meta.url).href,
  fish:   new URL('../assets/placeholder-fish.svg', import.meta.url).href,
};
