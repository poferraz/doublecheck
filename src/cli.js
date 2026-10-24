import fs from 'fs';
import path from 'path';
import { checkEnvironment } from './doctor.js';
import { runDualAudit } from './orchestrator.js';
import { synthesizeReport } from './reporter.js';

export function parseCliArgs(argv = []) {
  const config = {
    targetPath: '.',
    model: '',
    ollamaEndpoint: 'http://localhost:11434',
    format: 'markdown',
    output: 'doublecheck-report.md',
    doctorOnly: false,
    findingsFile: '',
    initReview: false,
    help: false
  };

  const args = [...argv];
  while (args.length > 0) {
    const current = args.shift();

    if (current === '--help' || current === '-h') {
      config.help = true;
    } else if (current === '--model' || current === '-m') {
      config.model = args.shift() || '';
    } else if (current === '--ollama') {
      config.ollamaEndpoint = args.shift() || 'http://localhost:11434';
    } else if (current === '--format' || current === '-f') {
      config.format = args.shift() || 'markdown';
    } else if (current === '--output' || current === '-o') {
      config.output = args.shift() || 'doublecheck-report.md';
    } else if (current === '--doctor-only') {
      config.doctorOnly = true;
    } else if (current === '--init-review' || current === '--init-review-md') {
      config.initReview = true;
    } else if (current === '--findings') {
      config.findingsFile = args.shift() || '';
    } else if (!current.startsWith('-') && config.targetPath === '.') {
      config.targetPath = current;
    }
  }

  return config;
}

export function printHelp() {
  console.log(`
\x1b[1m\x1b[36mdoublecheck\x1b[0m — Multi-Perspective Code Security & Architecture Review

\x1b[1mUSAGE:\x1b[0m
  npx doublecheck [path] [options]

\x1b[1mARGUMENTS:\x1b[0m
  path                   Target directory or file to audit (default: '.')

\x1b[1mOPTIONS:\x1b[0m
  -m, --model <name>     Specify Ollama LLM model name (default: auto-detected)
  --ollama <url>         Custom Ollama API base URL (default: http://localhost:11434)
  -f, --format <format>  Report format: 'markdown', 'json', or 'both' (default: markdown)
  -o, --output <file>    Output destination file (default: doublecheck-report.md)
  --findings <file>      Path to pre-computed Cloudflare findings JSON
  --init-review          Generate .github/REVIEW.md for Claude Code Review
  --doctor-only          Check local environment and exit
  -h, --help             Show this help message

\x1b[1mEXAMPLES:\x1b[0m
  npx doublecheck .
  npx doublecheck src/ --model deepseek-v4.1-flash:1017-cloud
  npx doublecheck . --format json -o audit.json
`);
}

export function generateDefaultReviewMd() {
  return `# Code Review Guidelines

This document configures automated code review behaviors for Claude Code Review on pull requests, enforcing the \`doublecheck\` multi-perspective review standard.

---

## Focus Areas

1. **The Adversary Lens (Cloudflare Security Audit Standard):**
   - AI & LLM Security: Detect prompt injection sinks, unvalidated tool parameter execution, homoglyph normalization bypasses.
   - Client-Side Security: Unescaped \`innerHTML\`/\`outerHTML\`, DOM XSS sinks, sensitive token exposure in \`document.cookie\` or \`localStorage\`.
   - Cloud & Deployment: Server-side request forgery (SSRF), unauthenticated proxies, wildcard CORS headers on credentialed endpoints.
   - Cryptographic Integrity: Truncated digest hashes, nonces without domain separation, secrets in version control.

2. **The Architect Lens (Alibaba Open Code Review Standard):**
   - AST Correctness: Null dereferences, missing optional chaining on dynamic payloads, incomplete object spread defaults.
   - Async & Concurrency: Unhandled promise rejections, missing fetch abort signals, unmanaged timer leaks, state race conditions.
   - Type Coercion: Implicit boolean conversions, regex truncation on delimiter boundaries.

---

## Convergence & Prioritization

When an Adversary attack class and an Architect AST invariant both flag the exact same code location, declare a **Converged High-Confidence Defect (P0)**.

---

## Severity Levels

### Blocker (P0)
- Converged defects: Any line where an architectural flaw directly enables an exploitable attack class.
- Critical vulnerabilities: Arbitrary command execution, unrestricted SSRF, cleartext secret exposure, DOM XSS.

### Major (P1)
- Architectural bugs: Unhandled Promise rejections, missing error boundaries, potential memory leaks in production paths.
- High-severity security issues: Missing rate limits on expensive operations, permissive CORS.

### Minor (P2)
- Code style, non-critical refactor suggestions, documentation omissions.

---

## Ignored Paths
- \`node_modules/**\`
- \`dist/**\`
- \`coverage/**\`
`;
}

export async function runCli(argv = process.argv.slice(2)) {
  const config = parseCliArgs(argv);

  if (config.help) {
    printHelp();
    return 0;
  }

  if (config.initReview) {
    const targetDir = config.targetPath === '.' ? process.cwd() : path.resolve(config.targetPath);
    const githubDir = path.join(targetDir, '.github');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }
    const targetFile = path.join(githubDir, 'REVIEW.md');
    fs.writeFileSync(targetFile, generateDefaultReviewMd(), 'utf8');
    console.log(`\n\x1b[32m✔\x1b[0m Created Claude Code Review configuration at \x1b[1m${targetFile}\x1b[0m`);
    return 0;
  }

  console.log(`\n\x1b[1m\x1b[34m[doublecheck]\x1b[0m Running pre-flight environment checks...`);
  const doctor = await checkEnvironment({
    ollamaEndpoint: config.ollamaEndpoint,
    model: config.model
  });

  if (!doctor.ok) {
    console.error(`\n\x1b[31m[ERROR]\x1b[0m Pre-flight checks failed:`);
    doctor.errors.forEach(err => console.error(`  - ${err}`));
    return 1;
  }

  console.log(`\x1b[32m✔\x1b[0m Local Ollama connected at ${config.ollamaEndpoint}`);
  console.log(`\x1b[32m✔\x1b[0m Active model: \x1b[1m${doctor.activeModel}\x1b[0m`);
  if (doctor.ocrAvailable) {
    console.log(`\x1b[32m✔\x1b[0m Alibaba Open Code Review (ocr) available`);
  }

  if (config.doctorOnly) {
    console.log(`\nEnvironment is fully ready for audits.`);
    return 0;
  }

  console.log(`\n\x1b[1m\x1b[34m[doublecheck]\x1b[0m Starting Dual-Perspective Audit on \x1b[1m${config.targetPath}\x1b[0m...`);
  console.log(`  1. Lens 1: The Adversary (Cloudflare Security Audit Standard)`);
  console.log(`  2. Lens 2: The Principal Architect (Alibaba Open Code Review)`);

  const rawResults = await runDualAudit(config.targetPath, {
    model: doctor.activeModel,
    ollamaEndpoint: config.ollamaEndpoint,
    findingsFile: config.findingsFile
  });

  const report = synthesizeReport(rawResults);

  // Write outputs
  if (config.format === 'json' || config.format === 'both') {
    const jsonPath = config.format === 'both' ? config.output.replace(/\.md$/, '.json') : config.output;
    fs.writeFileSync(jsonPath, JSON.stringify(report.json, null, 2), 'utf8');
    console.log(`\n\x1b[32m✔\x1b[0m JSON report saved to \x1b[1m${jsonPath}\x1b[0m`);
  }

  if (config.format === 'markdown' || config.format === 'both') {
    fs.writeFileSync(config.output, report.markdown, 'utf8');
    console.log(`\n\x1b[32m✔\x1b[0m Markdown report saved to \x1b[1m${config.output}\x1b[0m`);
  }

  console.log(`\n\x1b[1mAudit Complete:\x1b[0m`);
  console.log(`  - Converged High-Confidence Defects: \x1b[1m\x1b[31m${report.convergedCount}\x1b[0m`);
  console.log(`  - Priority 0 Immediate Fixes: \x1b[1m\x1b[31m${report.p0Count}\x1b[0m`);
  console.log(`  - Priority 1 Quality & Security: \x1b[33m${report.p1Count}\x1b[0m`);
  console.log(`  - Priority 2 Hardening: ${report.p2Count}`);

  return 0;
}
