function normalizePath(p = '') {
  return p.replace(/\\/g, '/').replace(/^\.?\//, '').trim();
}

export function detectConvergence(cfFindings = [], aliComments = []) {
  const converged = [];

  for (const cf of cfFindings) {
    const cfFile = normalizePath(cf.file || (cf.trace && cf.trace[0] && cf.trace[0].file) || '');
    const cfLine = cf.line || (cf.trace && cf.trace[0] && cf.trace[0].line) || 0;

    for (const ali of aliComments) {
      const aliFile = normalizePath(ali.path || '');
      const aliStart = ali.start_line || 0;
      const aliEnd = ali.end_line || aliStart;

      // Check matching file
      if (cfFile && aliFile && (cfFile.endsWith(aliFile) || aliFile.endsWith(cfFile))) {
        // Check line overlap or close proximity (+/- 3 lines)
        if (cfLine === 0 || (cfLine >= aliStart - 3 && cfLine <= aliEnd + 3)) {
          converged.push({
            file: cfFile,
            line: cfLine || aliStart,
            cfFinding: cf,
            aliComment: ali
          });
          break;
        }
      }
    }
  }

  return converged;
}

export function synthesizeReport(results) {
  const {
    targetPath = '.',
    modelUsed = 'auto',
    timestamp = new Date().toISOString(),
    cloudflareFindings = [],
    alibabaComments = [],
    errors = []
  } = results;

  const converged = detectConvergence(cloudflareFindings, alibabaComments);
  const convergedCfSet = new Set(converged.map(c => c.cfFinding.fingerprint || c.cfFinding.title));
  const convergedAliSet = new Set(converged.map(c => `${c.aliComment.path}:${c.aliComment.start_line}`));

  // Priority Buckets
  const p0 = [];
  const p1 = [];
  const p2 = [];

  // P0: Converged findings
  for (const c of converged) {
    p0.push({
      type: 'CONVERGED',
      title: c.cfFinding.title || 'Converged Security & Architectural Defect',
      file: c.file,
      line: c.line,
      severity: 'CRITICAL',
      details: `Cloudflare (${c.cfFinding.attack_class || 'EXPLOIT'}): ${c.cfFinding.title}. Alibaba (${c.aliComment.category || 'DEFECT'}): ${c.aliComment.content}`,
      remediation: c.cfFinding.remediation?.strategy || c.aliComment.suggestion_code || ''
    });
  }

  // Non-converged Cloudflare findings
  for (const cf of cloudflareFindings) {
    const key = cf.fingerprint || cf.title;
    if (convergedCfSet.has(key)) continue;

    const sev = (typeof cf.severity === 'object' ? cf.severity.overall_severity : cf.severity) || 'medium';
    const item = {
      type: 'SECURITY_AUDIT',
      title: cf.title,
      file: cf.file || (cf.trace && cf.trace[0]?.file) || '',
      line: cf.line || (cf.trace && cf.trace[0]?.line) || 0,
      severity: sev.toUpperCase(),
      details: cf.description || cf.root_cause || '',
      remediation: cf.remediation?.strategy || ''
    };

    if (sev === 'critical') p0.push(item);
    else if (sev === 'high') p1.push(item);
    else p2.push(item);
  }

  // Non-converged Alibaba comments
  for (const ali of alibabaComments) {
    const key = `${ali.path}:${ali.start_line}`;
    if (convergedAliSet.has(key)) continue;

    const sev = ali.severity || 'low';
    const item = {
      type: 'CODE_REVIEW',
      title: `[${(ali.category || 'DEFECT').toUpperCase()}] ${ali.path}:${ali.start_line}`,
      file: ali.path || '',
      line: ali.start_line || 0,
      severity: sev.toUpperCase(),
      details: ali.content || '',
      remediation: ali.suggestion_code || ''
    };

    if (sev === 'critical') p0.push(item);
    else if (sev === 'high') p1.push(item);
    else p2.push(item);
  }

  // Generate Markdown
  let markdown = `# \`doublecheck\` Audit Report\n\n`;
  markdown += `**Target Path:** \`${targetPath}\`  \n`;
  markdown += `**Model:** \`${modelUsed}\`  \n`;
  markdown += `**Timestamp:** ${timestamp}  \n\n`;

  markdown += `## 1. Executive Scorecard\n\n`;
  markdown += `| Metric | Count |\n`;
  markdown += `| :--- | :---: |\n`;
  markdown += `| **Converged Defects (Both Agreed)** | **${converged.length}** |\n`;
  markdown += `| **Priority 0 (Immediate Fixes)** | **${p0.length}** |\n`;
  markdown += `| **Priority 1 (High Quality & Security)** | **${p1.length}** |\n`;
  markdown += `| **Priority 2 (Defensive Hardening)** | **${p2.length}** |\n`;
  markdown += `| Total Cloudflare Findings | ${cloudflareFindings.length} |\n`;
  markdown += `| Total Alibaba Annotations | ${alibabaComments.length} |\n\n`;

  if (converged.length > 0) {
    markdown += `## 2. Convergence Matrix\n\n`;
    markdown += `*Defects independently verified by both the Attacker Lens (Cloudflare) and the Principal Architect Lens (Alibaba):*\n\n`;
    markdown += `| Target File & Line | Cloudflare Adversary Finding | Alibaba Architect Finding | Action |\n`;
    markdown += `| :--- | :--- | :--- | :---: |\n`;
    for (const c of converged) {
      markdown += `| \`${c.file}:${c.line}\` | **${c.cfFinding.title}** | ${c.aliComment.content.slice(0, 120)}... | **P0 Fix** |\n`;
    }
    markdown += `\n`;
  }

  if (p0.length > 0) {
    markdown += `## 3. Priority 0 (Immediate Fixes)\n\n`;
    for (const item of p0) {
      markdown += `### [${item.severity}] ${item.title}\n`;
      markdown += `- **Location:** \`${item.file}:${item.line}\`\n`;
      markdown += `- **Diagnosis:** ${item.details}\n`;
      if (item.remediation) {
        markdown += `- **Recommended Fix:**\n\`\`\`javascript\n${item.remediation}\n\`\`\`\n`;
      }
      markdown += `\n`;
    }
  }

  if (p1.length > 0) {
    markdown += `## 4. Priority 1 (High Quality & Security)\n\n`;
    for (const item of p1) {
      markdown += `- **[${item.severity}] \`${item.file}:${item.line}\`:** ${item.title} — ${item.details.slice(0, 160)}\n`;
    }
    markdown += `\n`;
  }

  if (p2.length > 0) {
    markdown += `## 5. Priority 2 (Defensive Hardening)\n\n`;
    for (const item of p2) {
      markdown += `- **[${item.severity}] \`${item.file}:${item.line}\`:** ${item.details.slice(0, 140)}\n`;
    }
    markdown += `\n`;
  }

  if (errors.length > 0) {
    markdown += `## Diagnostics & Warnings\n\n`;
    for (const err of errors) {
      markdown += `- ⚠️ ${err}\n`;
    }
    markdown += `\n`;
  }

  const json = {
    summary: {
      targetPath,
      modelUsed,
      timestamp,
      convergedDefects: converged.length,
      p0Count: p0.length,
      p1Count: p1.length,
      p2Count: p2.length,
      totalCloudflare: cloudflareFindings.length,
      totalAlibaba: alibabaComments.length
    },
    converged,
    p0,
    p1,
    p2,
    errors
  };

  return {
    markdown,
    json,
    convergedCount: converged.length,
    p0Count: p0.length,
    p1Count: p1.length,
    p2Count: p2.length
  };
}
