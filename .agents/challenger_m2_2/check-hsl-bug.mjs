import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import fs from 'fs';
import path from 'path';

async function checkHslBug() {
  const cssFilePath = path.resolve('src/app/globals.css');
  const css = fs.readFileSync(cssFilePath, 'utf-8');
  const result = await postcss([tailwindcss()]).process(css, { from: cssFilePath });

  const lines = result.css.split('\n');
  const hslLines = [];
  lines.forEach((line, idx) => {
    if (line.includes('hsl(')) {
      hslLines.push({ lineNum: idx + 1, content: line.trim() });
    }
  });

  console.log("=== HSL SYNTAX BUG AUDIT ===");
  console.log(`Found ${hslLines.length} lines with hsl() in compiled CSS:`);
  hslLines.forEach(h => console.log(`Line ${h.lineNum}: ${h.content}`));
}

checkHslBug();
