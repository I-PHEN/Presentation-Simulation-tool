import fs from 'fs';
import path from 'path';

// Find all tsx/ts files under src/
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allSrcFiles = getFiles(path.resolve('src'));

console.log("=== COMPONENT TOKEN & GLASSMORPHISM AUDIT ===");
console.log("Total TS/TSX source files:", allSrcFiles.length);

let glassPanelCount = 0;
let glassCardCount = 0;
let glassReflectionCount = 0;
let glassGlowCount = 0;

const hardcodedColorPattern = /(bg|text|border|ring|shadow)-\[(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\]/g;
const hardcodedMatches = [];

const backdropBlurPattern = /backdrop-blur(-[a-z0-9]+)?/g;
const backdropBlurMatches = [];

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(process.cwd(), file);

  if (content.includes('glass-panel')) glassPanelCount++;
  if (content.includes('glass-card')) glassCardCount++;
  if (content.includes('glass-reflection')) glassReflectionCount++;
  if (content.includes('glass-panel-glow')) glassGlowCount++;

  let match;
  while ((match = hardcodedColorPattern.exec(content)) !== null) {
    hardcodedMatches.push({ file: relPath, match: match[0] });
  }

  while ((match = backdropBlurPattern.exec(content)) !== null) {
    backdropBlurMatches.push({ file: relPath, match: match[0] });
  }
}

console.log("\n--- Glassmorphism Token Usage across components ---");
console.log(`glass-panel: used in ${glassPanelCount} files`);
console.log(`glass-card: used in ${glassCardCount} files`);
console.log(`glass-reflection: used in ${glassReflectionCount} files`);
console.log(`glass-panel-glow: used in ${glassGlowCount} files`);

console.log("\n--- Backdrop Blur Usage (direct vs token) ---");
console.log(`Total files with direct backdrop-blur classes: ${new Set(backdropBlurMatches.map(m => m.file)).size}`);
backdropBlurMatches.forEach(m => {
  if (!m.file.includes('globals.css')) {
    console.log(`  ${m.file}: ${m.match}`);
  }
});

console.log("\n--- Hardcoded Arbitrary Colors in Components ---");
console.log(`Total hardcoded color usages found: ${hardcodedMatches.length}`);
hardcodedMatches.forEach(m => {
  console.log(`  ${m.file}: ${m.match}`);
});
