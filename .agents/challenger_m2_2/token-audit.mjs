import fs from 'fs';
import path from 'path';

// Read src/app/globals.css
const cssContent = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf-8');

// Simple parser for CSS variables inside :root and .dark
function extractCssVars(blockContent) {
  const vars = {};
  const regex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(blockContent)) !== null) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/);

const rootVars = rootMatch ? extractCssVars(rootMatch[1]) : {};
const darkVars = darkMatch ? extractCssVars(darkMatch[1]) : {};

console.log("=== CSS VARS AUDIT ===");
console.log("Root (Light) vars count:", Object.keys(rootVars).length);
console.log("Dark vars count:", Object.keys(darkVars).length);

// 1. Check for missing vars in light vs dark
const rootKeys = Object.keys(rootVars);
const darkKeys = Object.keys(darkVars);

const missingInDark = rootKeys.filter(k => !(k in darkVars));
const missingInRoot = darkKeys.filter(k => !(k in rootKeys));

console.log("\n--- Missing in Dark ---");
if (missingInDark.length > 0) {
  missingInDark.forEach(k => console.log(`  - --${k}: (in :root as ${rootVars[k]})`));
} else {
  console.log("None");
}

console.log("\n--- Missing in Root ---");
if (missingInRoot.length > 0) {
  missingInRoot.forEach(k => console.log(`  - --${k}: (in .dark as ${darkVars[k]})`));
} else {
  console.log("None");
}

// 2. Helper functions to calculate luminance and contrast ratio for HEX colors
function parseHex(hex) {
  hex = hex.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return null;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

function getLuminance({ r, g, b }) {
  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(hex1, hex2) {
  const rgb1 = parseHex(hex1);
  const rgb2 = parseHex(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

// 3. Contrast audit for key text/bg pairs
const pairs = [
  ['foreground', 'background'],
  ['surface-foreground', 'surface'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'muted'],
  ['accent-foreground', 'accent'],
  ['sidebar-foreground', 'sidebar'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
  ['sidebar-accent-foreground', 'sidebar-accent'],
];

console.log("\n--- WCAG Contrast Audit (Light Mode) ---");
for (const [fgKey, bgKey] of pairs) {
  const fg = rootVars[fgKey];
  const bg = rootVars[bgKey];
  if (fg && bg && fg.startsWith('#') && bg.startsWith('#')) {
    const cr = getContrast(fg, bg);
    const passAA = cr >= 4.5 ? "PASS (AA)" : cr >= 3.0 ? "PASS (Large Text)" : "FAIL (<3.0)";
    console.log(`  ${fgKey} (${fg}) on ${bgKey} (${bg}): Ratio ${cr.toFixed(2)}:1 -> ${passAA}`);
  }
}

console.log("\n--- WCAG Contrast Audit (Dark Mode) ---");
for (const [fgKey, bgKey] of pairs) {
  const fg = darkVars[fgKey];
  const bg = darkVars[bgKey];
  if (fg && bg && fg.startsWith('#') && bg.startsWith('#')) {
    const cr = getContrast(fg, bg);
    const passAA = cr >= 4.5 ? "PASS (AA)" : cr >= 3.0 ? "PASS (Large Text)" : "FAIL (<3.0)";
    console.log(`  ${fgKey} (${fg}) on ${bgKey} (${bg}): Ratio ${cr.toFixed(2)}:1 -> ${passAA}`);
  }
}

// 4. Glassmorphism token evaluation
console.log("\n--- Glassmorphism Token Evaluation ---");
console.log("Light Mode Glass BG:", rootVars['glass-bg']);
console.log("Light Mode Glass Border:", rootVars['glass-border']);
console.log("Light Mode Glass Reflection Top:", rootVars['glass-reflection-top']);
console.log("Light Mode Glass Shadow:", rootVars['glass-shadow']);
console.log("Dark Mode Glass BG:", darkVars['glass-bg']);
console.log("Dark Mode Glass Border:", darkVars['glass-border']);
console.log("Dark Mode Glass Reflection Top:", darkVars['glass-reflection-top']);
console.log("Dark Mode Glass Shadow:", darkVars['glass-shadow']);
