// verify_contrast.mjs
// Calculates WCAG 2.1 contrast ratios for design tokens in globals.css

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]) {
  const sRGB = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

const lightTokens = {
  background: '#FBFBFD',
  foreground: '#14161B',
  surface: '#F4F5F8',
  surfaceForeground: '#14161B',
  card: '#FFFFFF',
  cardForeground: '#14161B',
  popover: '#FFFFFF',
  popoverForeground: '#14161B',
  primary: '#3E5FD9',
  primaryForeground: '#F8FAFF',
  secondary: '#F4F5F8',
  secondaryForeground: '#14161B',
  muted: '#F4F5F8',
  mutedForeground: '#5B616E',
  accent: '#EDF1FE',
  accentForeground: '#29429C',
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF', // standard default text on destructive
  border: '#E5E7EE',
  sidebar: '#F7F8FB',
  sidebarForeground: '#14161B',
  sidebarPrimary: '#3E5FD9',
  sidebarPrimaryForeground: '#F8FAFF',
  sidebarAccent: '#EDF1FE',
  sidebarAccentForeground: '#29429C',
  warning: '#B45309',
  success: '#15803D'
};

const darkTokens = {
  background: '#08090C',
  foreground: '#E7EAF0',
  surface: '#0C0E12',
  surfaceForeground: '#E7EAF0',
  card: '#101217',
  cardForeground: '#E7EAF0',
  popover: '#171A20',
  popoverForeground: '#E7EAF0',
  primary: '#4C8DFF',
  primaryForeground: '#08090C',
  secondary: '#0C0E12',
  secondaryForeground: '#E7EAF0',
  muted: '#161920',
  mutedForeground: '#868D99',
  accent: '#141F33',
  accentForeground: '#A6C6FF',
  destructive: '#E5484D',
  destructiveForeground: '#08090C',
  border: '#282C35',
  sidebar: '#060709',
  sidebarForeground: '#E7EAF0',
  sidebarPrimary: '#4C8DFF',
  sidebarPrimaryForeground: '#08090C',
  sidebarAccent: '#141F33',
  sidebarAccentForeground: '#A6C6FF',
  warning: '#D9822B',
  success: '#3FB950'
};

const lightPairs = [
  ['foreground on background', lightTokens.foreground, lightTokens.background, 4.5],
  ['surfaceForeground on surface', lightTokens.surfaceForeground, lightTokens.surface, 4.5],
  ['cardForeground on card', lightTokens.cardForeground, lightTokens.card, 4.5],
  ['popoverForeground on popover', lightTokens.popoverForeground, lightTokens.popover, 4.5],
  ['primaryForeground on primary', lightTokens.primaryForeground, lightTokens.primary, 4.5],
  ['secondaryForeground on secondary', lightTokens.secondaryForeground, lightTokens.secondary, 4.5],
  ['mutedForeground on muted', lightTokens.mutedForeground, lightTokens.muted, 4.5],
  ['mutedForeground on background', lightTokens.mutedForeground, lightTokens.background, 4.5],
  ['accentForeground on accent', lightTokens.accentForeground, lightTokens.accent, 4.5],
  ['sidebarForeground on sidebar', lightTokens.sidebarForeground, lightTokens.sidebar, 4.5],
  ['sidebarPrimaryForeground on sidebarPrimary', lightTokens.sidebarPrimaryForeground, lightTokens.sidebarPrimary, 4.5],
  ['sidebarAccentForeground on sidebarAccent', lightTokens.sidebarAccentForeground, lightTokens.sidebarAccent, 4.5],
  ['warning on background', lightTokens.warning, lightTokens.background, 4.5],
  ['warning on surface', lightTokens.warning, lightTokens.surface, 4.5],
  ['success on background', lightTokens.success, lightTokens.background, 4.5],
  ['success on surface', lightTokens.success, lightTokens.surface, 4.5],
  ['destructive on background', lightTokens.destructive, lightTokens.background, 4.5]
];

const darkPairs = [
  ['foreground on background', darkTokens.foreground, darkTokens.background, 4.5],
  ['surfaceForeground on surface', darkTokens.surfaceForeground, darkTokens.surface, 4.5],
  ['cardForeground on card', darkTokens.cardForeground, darkTokens.card, 4.5],
  ['popoverForeground on popover', darkTokens.popoverForeground, darkTokens.popover, 4.5],
  ['primaryForeground on primary', darkTokens.primaryForeground, darkTokens.primary, 4.5],
  ['secondaryForeground on secondary', darkTokens.secondaryForeground, darkTokens.secondary, 4.5],
  ['mutedForeground on muted', darkTokens.mutedForeground, darkTokens.muted, 4.5],
  ['mutedForeground on background', darkTokens.mutedForeground, darkTokens.background, 4.5],
  ['accentForeground on accent', darkTokens.accentForeground, darkTokens.accent, 4.5],
  ['sidebarForeground on sidebar', darkTokens.sidebarForeground, darkTokens.sidebar, 4.5],
  ['sidebarPrimaryForeground on sidebarPrimary', darkTokens.sidebarPrimaryForeground, darkTokens.sidebarPrimary, 4.5],
  ['sidebarAccentForeground on sidebarAccent', darkTokens.sidebarAccentForeground, darkTokens.sidebarAccent, 4.5],
  ['warning on background', darkTokens.warning, darkTokens.background, 4.5],
  ['warning on surface', darkTokens.warning, darkTokens.surface, 4.5],
  ['success on background', darkTokens.success, darkTokens.background, 4.5],
  ['success on surface', darkTokens.success, darkTokens.surface, 4.5],
  ['destructive on background', darkTokens.destructive, darkTokens.background, 4.5]
];

console.log('=== LIGHT MODE CONTRAST AUDIT ===');
let lightFailures = 0;
for (const [name, fg, bg, threshold] of lightPairs) {
  const ratio = contrastRatio(fg, bg);
  const pass = ratio >= threshold;
  if (!pass) lightFailures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: fg=${fg}, bg=${bg} -> Ratio: ${ratio.toFixed(2)}:1 (Min: ${threshold}:1)`);
}

console.log('\n=== DARK MODE CONTRAST AUDIT ===');
let darkFailures = 0;
for (const [name, fg, bg, threshold] of darkPairs) {
  const ratio = contrastRatio(fg, bg);
  const pass = ratio >= threshold;
  if (!pass) darkFailures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: fg=${fg}, bg=${bg} -> Ratio: ${ratio.toFixed(2)}:1 (Min: ${threshold}:1)`);
}

console.log(`\nTotal Light Failures: ${lightFailures}, Total Dark Failures: ${darkFailures}`);
