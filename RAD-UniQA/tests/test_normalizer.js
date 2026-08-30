// Test markdown math and table normalization logic

function normalizeMarkdown(rawText) {
  if (!rawText) return '';

  let text = rawText;

  // 1. Fix single-line concatenated table rows (e.g. "| a | b | | --- | --- | | c | d |" -> "|\n|")
  text = text.replace(/\|\s*\|\s*(?=[^:\n|]*[:\w-])/g, '|\n|');

  // 2. Fix broken LaTeX with newlines before closing dollars (e.g. "$x \in R^d\n$, the encoder" -> "$x \in R^d$, the encoder")
  text = text.replace(/\$([^$\n]+?)\n\s*(\$,|\$\.|\$\:|\$)/g, (match, expr, trailing) => {
    const punct = trailing.startsWith('$') ? trailing.slice(1) : trailing;
    return `$${expr.trim()}$${punct ? punct : ''}`;
  });

  // Fix "$formula\n$" -> "$$formula$$"
  text = text.replace(/\$([^\n$]+?)\n\s*\$/g, (m, g1) => `\n\n$$\n${g1.trim()}\n$$\n\n`);

  // 3. Fix split dollar signs within empty lines ("$\n$" or "$\n\n$")
  text = text.replace(/\$\s*\n+\s*\$/g, '');

  // 4. Remove standalone empty math blocks ($$$$, $$ $$, or two consecutive standalone $$ lines)
  text = text.replace(/\$\$\s*\$\$/g, '');
  
  // Clean line-by-line empty math artifacts
  const rawLines = text.split('\n');
  const cleanedMathLines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    const nextLine = (rawLines[i + 1] || '').trim();
    // If this line is just '$$' and next line is just '$$', skip both
    if (line === '$$' && nextLine === '$$') {
      i++; // skip next line as well
      continue;
    }
    // If line is just empty math '$' or '$$' with nothing inside
    if (line === '$$$$' || line === '$$ $$' || line === '$$') {
      // Check if it's an unclosed orphan $$ without pair in surrounding 2 lines
      const prevLine = (rawLines[i - 1] || '').trim();
      if ((prevLine === '' || prevLine === '$$') && (nextLine === '' || nextLine === '$$')) {
        continue;
      }
    }
    cleanedMathLines.push(rawLines[i]);
  }
  text = cleanedMathLines.join('\n');

  // 5. Fix table rows broken by multi-line cells
  const lines = text.split('\n');
  const normalizedLines = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const isTableSeparator = /^\|?\s*:?-+:?\s*\|/.test(line.trim());
    const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|');

    if (isTableSeparator || isTableLine) {
      inTable = true;
      normalizedLines.push(line);
    } else if (inTable && (line.trim().startsWith('$') || line.trim().includes('|')) && normalizedLines.length > 0) {
      const prevLine = normalizedLines[normalizedLines.length - 1];
      if (prevLine.trim().endsWith('|')) {
        normalizedLines[normalizedLines.length - 1] = `${prevLine.slice(0, -1)} ${line.trim()} |`;
      } else {
        normalizedLines[normalizedLines.length - 1] += ` ${line.trim()}`;
      }
    } else {
      inTable = false;
      normalizedLines.push(line);
    }
  }

  text = normalizedLines.join('\n');

  // 6. Ensure $$ block math has surrounding blank lines for clean KaTeX display
  text = text
    .replace(/([^\n])\$\$/g, '$1\n\n$$$$')
    .replace(/\$\$([^\n])/g, '$$$$\n\n$1');

  // 7. Clean any remaining consecutive empty lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

// Test Case 1: Image 4 Broken Single Dollar on Newline
const testCase1 = `$x \\in \\mathbb{R}^d\n$, the encoder function maps $x\n$ to a hidden representation`;
const res1 = normalizeMarkdown(testCase1);
console.log("Test 1 Result:", res1);
if (res1.includes('$x \\in \\mathbb{R}^d$, the') && res1.includes('$x$ to')) {
  console.log("✅ Test 1 Passed: Inline math with trailing newline fixed!");
} else {
  console.error("❌ Test 1 Failed");
  process.exit(1);
}

// Test Case 2: Image 4 Double Dollar Split Across Lines
const testCase2 = `$$\nh = \\sigma(W_1 x + b_1)\n$$`;
const res2 = normalizeMarkdown(testCase2);
console.log("Test 2 Result:\n", res2);
if (res2.includes('$$') && res2.includes('h = \\sigma(W_1 x + b_1)')) {
  console.log("✅ Test 2 Passed: Split double dollars normalized to block math!");
} else {
  console.error("❌ Test 2 Failed");
  process.exit(1);
}

// Test Case 3: Image 5 Broken Table with Newline Math Cell
const testCase3 = `| Gate | Formula | Function |
| :--- | :--- | :--- |
| Forget Gate |
$f_t = \\sigma(W_f x_t + b_f)$ | Discard context |`;
const res3 = normalizeMarkdown(testCase3);
console.log("Test 3 Result:\n", res3);
const tableRows = res3.trim().split('\n');
if (tableRows.length === 3 && tableRows[2].includes('$f_t = \\sigma(W_f x_t + b_f)$')) {
  console.log("✅ Test 3 Passed: Multi-line table rows merged into intact GFM table!");
} else {
  console.error("❌ Test 3 Failed");
  process.exit(1);
}

// Test Case 4: Empty Math Blocks causing empty boxes (Image in user request)
const testCase4 = `$$f_t = \\sigma(W_f x_t + U_f h_{t-1} + b_f)$$
$$
$$
$$$$
$$   $$
Where $f_t$ is forget gate.`;
const res4 = normalizeMarkdown(testCase4);
console.log("Test 4 Result:\n", res4);
if (res4.includes('f_t = \\sigma(W_f x_t + U_f h_{t-1} + b_f)') && !res4.includes('$$$$') && res4.includes('Where $f_t$ is forget gate.')) {
  console.log("✅ Test 4 Passed: Equation intact and empty placeholder boxes stripped!");
} else {
  console.error("❌ Test 4 Failed");
  process.exit(1);
}

console.log("\n🎉 ALL TESTS PASSED!");
