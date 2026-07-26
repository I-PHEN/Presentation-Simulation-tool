import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import fs from 'fs';
import path from 'path';

async function testCompile() {
  const cssFilePath = path.resolve('src/app/globals.css');
  const css = fs.readFileSync(cssFilePath, 'utf-8');

  try {
    const result = await postcss([tailwindcss()]).process(css, { from: cssFilePath });
    console.log("PostCSS CSS Compilation Successful!");
    console.log("Output CSS length:", result.css.length);
    
    // Search for hsl( or var(-- background
    const hslMatches = result.css.match(/hsl\([^)]+\)/g) || [];
    console.log(`Found ${hslMatches.length} hsl(...) instances in compiled CSS.`);
    if (hslMatches.length > 0) {
      console.log("Sample hsl matches:", hslMatches.slice(0, 10));
    }

    const varMatches = result.css.match(/--color-[a-z0-9-]+:\s*[^;]+;/g) || [];
    console.log(`Found ${varMatches.length} --color- theme variable mappings.`);
    varMatches.forEach(v => console.log("  ", v));

    // Check if glass utility classes are compiled properly
    const glassPanelCompiled = result.css.includes('.glass-panel');
    const glassCardCompiled = result.css.includes('.glass-card');
    const glassReflectionCompiled = result.css.includes('.glass-reflection');
    const glassGlowCompiled = result.css.includes('.glass-panel-glow');

    console.log("\n--- Glass Utilities Output Check ---");
    console.log(".glass-panel:", glassPanelCompiled ? "FOUND" : "MISSING");
    console.log(".glass-card:", glassCardCompiled ? "FOUND" : "MISSING");
    console.log(".glass-reflection:", glassReflectionCompiled ? "FOUND" : "MISSING");
    console.log(".glass-panel-glow:", glassGlowCompiled ? "FOUND" : "MISSING");

  } catch (err) {
    console.error("PostCSS Compilation Error:", err);
  }
}

testCompile();
