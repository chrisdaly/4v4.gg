#!/usr/bin/env node
/**
 * Validates that design-tokens.js matches App.css :root variables
 * Run: npm run validate-tokens
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Import tokens
const tokensPath = path.join(rootDir, 'src/lib/design-tokens.js');
const cssPath = path.join(rootDir, 'src/styles/App.css');

async function main() {
  // Dynamic import for ES modules
  const tokens = await import(tokensPath);
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Extract :root variables from CSS
  const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
  if (!rootMatch) {
    console.error('Could not find :root block in App.css');
    process.exit(1);
  }

  const cssVars = {};
  const varRegex = /--([\w-]+):\s*([^;]+);/g;
  let match;
  while ((match = varRegex.exec(rootMatch[1])) !== null) {
    cssVars[`--${match[1]}`] = match[2].trim();
  }

  const issues = [];
  const checked = new Set();

  // Check all token categories
  const categories = ['colors', 'fonts', 'typeScale', 'spacing', 'borders', 'effects', 'overlays', 'surfaces', 'tints', 'zIndex'];

  for (const category of categories) {
    const tokenGroup = tokens[category];
    if (!tokenGroup) continue;

    for (const [key, token] of Object.entries(tokenGroup)) {
      if (!token.css || !token.value) continue;

      checked.add(token.css);
      const cssValue = cssVars[token.css];

      if (!cssValue) {
        issues.push({ type: 'missing', css: token.css, expected: token.value });
      } else if (normalizeValue(cssValue) !== normalizeValue(String(token.value))) {
        issues.push({
          type: 'mismatch',
          css: token.css,
          expected: token.value,
          actual: cssValue
        });
      }
    }
  }

  // Report results
  console.log('\n🎨 Design Token Validation\n');
  console.log(`Checked ${checked.size} tokens against App.css :root\n`);

  if (issues.length === 0) {
    console.log('✅ All tokens match!\n');
    process.exit(0);
  }

  console.log(`⚠️  Found ${issues.length} issue(s):\n`);

  for (const issue of issues) {
    if (issue.type === 'missing') {
      console.log(`  MISSING: ${issue.css}`);
      console.log(`    Expected: ${issue.expected}\n`);
    } else {
      console.log(`  MISMATCH: ${issue.css}`);
      console.log(`    Tokens:  ${issue.expected}`);
      console.log(`    CSS:     ${issue.actual}\n`);
    }
  }

  process.exit(1);
}

function normalizeValue(val) {
  // Normalize for comparison (remove extra spaces, quotes, etc.)
  return val
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .trim()
    .toLowerCase();
}

main().catch(console.error);
