import path from 'node:path';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { checkEnvironment } from './doctor.js';
import { runDualAudit, resolveAuditTarget } from './orchestrator.js';
import { synthesizeReport, getReviewExitCode } from './reporter.js';
import { resolveOutputPaths, writeReports } from './output.js';
import { initializeReviewConfig } from './review-config.js';
export { generateDefaultReviewMd } from './review-config.js';

export function parseCliArgs(argv = []) {
  const { values, positionals } = parseArgs({ args: argv, strict: true, allowPositionals: true, options: {
    help: { type: 'boolean', short: 'h' }, model: { type: 'string', short: 'm' }, ollama: { type: 'string' },
    format: { type: 'string', short: 'f' }, output: { type: 'string', short: 'o' }, findings: { type: 'string' },
    'doctor-only': { type: 'boolean' }, 'init-review': { type: 'boolean' }, 'init-review-md': { type: 'boolean' },
    'ocr-provider': { type: 'string' }, 'allow-remote': { type: 'boolean' }, force: { type: 'boolean' }, mode: { type: 'string' }
  } });
  const format = values.format || 'markdown'; const reviewMode = values.mode || 'dual';
  const initReview = !!(values['init-review'] || values['init-review-md']);
  if (positionals.length > 1 || !['markdown', 'json', 'both'].includes(format) || !['dual', 'architect'].includes(reviewMode) || reviewMode === 'architect' && values.findings || values.force && !initReview) throw Error('Invalid or incompatible arguments.');
  for (const key of ['model', 'ollama', 'format', 'output', 'findings', 'ocr-provider', 'mode']) if (Object.hasOwn(values, key) && (!values[key].trim() || values[key].startsWith('-'))) throw Error('Missing option value.');
  return { targetPath: positionals[0] || '.', model: values.model || '', ollamaEndpoint: values.ollama || 'http://localhost:11434', format, output: values.output || (format === 'json' ? 'doublecheck-report.json' : 'doublecheck-report.md'), doctorOnly: !!values['doctor-only'], findingsFile: values.findings || '', initReview, help: !!values.help, ocrProvider: values['ocr-provider'] || 'ollama', allowRemote: !!values['allow-remote'], force: !!values.force, reviewMode };
}
export function printHelp() {
  console.log(`doublecheck — evidence-aware code review
Usage: npx @poferraz/doublecheck [path] [options]
  --mode <dual|architect>  Required review lenses (default: dual)
  -m, --model <name>      Installed Ollama model
  --ollama <url>         Ollama endpoint (default: http://localhost:11434)
  --ocr-provider <name>  Matching custom OCR provider (default: ollama)
  --allow-remote         Opt in to remote endpoints/cloud-tagged models
  --findings <file>      Import adversary findings (coverage remains unknown)
  -f, --format <value>   markdown, json, or both
  -o, --output <path>    Report destination
  --doctor-only         Verify required inference/tool configuration
  --init-review         Initialize review instructions without inference
  --force               Replace existing review instructions with --init-review
  -h, --help            Show help
Exit: 0 complete/no blockers; 1 confirmed high/critical; 2 incomplete, unresolved high/unrated, or operational failure.`);
}
const terminal = value => String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ');
export async function runCli(argv = process.argv.slice(2), dependencies = {}) {
  try {
    const config = parseCliArgs(argv);
    if (config.help) { printHelp(); return 0; }
    if (config.initReview) {
      const result = initializeReviewConfig(path.resolve(config.targetPath), { force: config.force });
      console.log(`Review instructions ${result.action}: ${terminal(result.path)}`);
      return 0;
    }
    resolveAuditTarget(config.targetPath);
    const paths = config.doctorOnly ? null : resolveOutputPaths({ ...config, protectedInputs: [fs.statSync(config.targetPath).isFile() ? config.targetPath : null, config.findingsFile] });
    const doctor = await (dependencies.checkEnvironment || checkEnvironment)({ ollamaEndpoint: config.ollamaEndpoint, model: config.model, ocrProvider: config.ocrProvider, allowRemote: config.allowRemote });
    for (const warning of doctor.warnings || []) console.warn(terminal(warning));
    if (!doctor.ok) { for (const error of doctor.errors || []) console.error(terminal(error)); return 2; }
    console.log(`Inference provider: ${terminal(doctor.inference?.provider)}; model: ${terminal(doctor.activeModel)}`);
    if (config.doctorOnly) { console.log('Required engine configuration is ready; this does not certify review coverage.'); return 0; }
    const raw = await (dependencies.runDualAudit || runDualAudit)(config.targetPath, { model: doctor.activeModel, inference: doctor.inference, ollamaEndpoint: config.ollamaEndpoint, ocrProvider: config.ocrProvider, allowRemote: config.allowRemote, findingsFile: config.findingsFile, reviewMode: config.reviewMode });
    const report = synthesizeReport(raw);
    const output = await (dependencies.writeReports || writeReports)(paths, report);
    for (const file of output.written) console.log(`Report saved: ${terminal(file)}`);
    if (output.diagnostics.length) { console.error('Report output failed; any saved artifact paths are listed above.'); return 2; }
    console.log(report.json.status === 'complete' ? 'Review complete' : report.json.status === 'failed' ? 'Review failed' : 'Review incomplete');
    console.log(`Confirmed P0: ${report.p0Count}; P1: ${report.p1Count}; unresolved: ${report.json.unresolved.length}`);
    return getReviewExitCode(report.json);
  } catch { console.error('Review failed: invalid arguments, target, configuration, or output. Run --help for usage.'); return 2; }
}
