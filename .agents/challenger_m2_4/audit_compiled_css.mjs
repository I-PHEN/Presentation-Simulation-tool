import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import fs from 'fs';
import path from 'path';

async function auditCss() {
  const cssFilePath = path.resolve('src/app/globals.css');
  const css = fs.readFileSync(cssFilePath, 'utf-8');
  const result = await postcss([tailwindcss()]).process(css, { from: cssFilePath });

  const lines = result.css.split('\n');
  const hslLines = [];
  const invalidHexHsl = [];

  lines.forEach((line, idx) => {
    if (line.includes('hsl(')) {
      hslLines.push({ lineNum: idx + 1, content: line.trim() });
    }
    if (/hsl\s*\(\s*#[0-9a-fA-F]+/i.test(line)) {
      invalidHexHsl.push({ lineNum: idx + 1, content: line.trim() });
    }
  });

  console.log("=== COMPILED CSS AUDIT ===");
  console.log(`Total lines in compiled CSS: ${lines.length}`);
  console.log(`Lines with hsl(): ${hslLines.length}`);
  console.log(`Invalid hsl(#hex) occurrences: ${invalidHexHsl.length}`);
  if (hslLines.length > 0) {
    hslLines.forEach(h => console.log(`Line ${h.lineNum}: ${h.content}`));
  }
}

auditCss().catch(err => {
  console.error("Error during CSS audit:", err);
  process.exit(1);
});
