// Rebuild the README GIF from the original, unmodified generated artwork.
// Requires Node.js 20+ and ffmpeg on PATH; no npm dependencies.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-hero-'));
const duration = 7;
const fps = 15;
const output = path.join(directory, 'doublecheck-hero.gif');
const inputs = ['-loop', '1', '-framerate', String(fps), '-t', String(duration), '-i', path.join(directory, 'doublecheck-hero.png')];
const colors = { amber: 'e9a03c', teal: '37ad9f' };

function layer(color, size, alpha, circle = false) {
  let filter = `color=c=0x${color}:s=${size}:r=${fps}:d=${duration},format=rgba`;
  if (circle) {
    const rgb = [0, 2, 4].map(i => parseInt(color.slice(i, i + 2), 16));
    filter += `,geq=r=${rgb[0]}:g=${rgb[1]}:b=${rgb[2]}:a='if(lte(pow(X-4.5,2)+pow(Y-4.5,2),20),240,0)'`;
  } else filter += `,colorchannelmixer=aa=${alpha}`;
  inputs.push('-f', 'lavfi', '-i', filter);
}
layer(colors.amber, '210x3', 0.8);
layer(colors.amber, '210x18', 0.12);
layer(colors.teal, '210x3', 0.8);
layer(colors.teal, '210x18', 0.12);
layer(colors.amber, '10x10', 1, true);
layer(colors.teal, '10x10', 1, true);

const progress = (start, length) => `min(max((t-${start})/${length},0),1)`;
const amber = progress(0.8, 1.6);
const teal = progress(3.1, 1.6);
// Follow the two existing paths into the report. Never animate a verdict.
function evidencePath(start, fromX, fromY, toY) {
  const u = progress(start, 0.7);
  const bend = `((${u}-0.28)/0.44)`;
  const smooth = `(${bend}*${bend}*(3-2*${bend}))`;
  return {
    x: `if(lte(${u},0.28),${fromX}+(1020-${fromX})*${u}/0.28,if(lte(${u},0.72),1020+60*${bend},1080+64*(${u}-0.72)/0.28))-5`,
    y: `if(lte(${u},0.28),${fromY},if(lte(${u},0.72),${fromY}+(${toY}-${fromY})*${smooth},${toY}))-5`
  };
}
const first = evidencePath(2.4, 967, 155, 204);
const second = evidencePath(4.7, 960, 320, 270);
const filters = [
  '[0:v]scale=1440:480:flags=lanczos,setsar=1,format=rgba[base]',
  `[base][2:v]overlay=x=700:y='125+216*${amber}-18':enable='between(t,0.8,2.4)':format=auto[a]`,
  `[a][1:v]overlay=x=700:y='125+216*${amber}':enable='between(t,0.8,2.4)':format=auto[b]`,
  `[b][4:v]overlay=x=700:y='341-216*${teal}+3':enable='between(t,3.1,4.7)':format=auto[c]`,
  `[c][3:v]overlay=x=700:y='341-216*${teal}':enable='between(t,3.1,4.7)':format=auto[d]`,
  `[d][5:v]overlay=x='${first.x}':y='${first.y}':enable='between(t,2.4,3.1)':format=auto[e]`,
  `[e][6:v]overlay=x='${second.x}':y='${second.y}':enable='between(t,4.7,5.4)':format=auto[animated]`
].join(';');

function run(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    encoding: 'utf8', timeout: 120_000, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024
  });
  if (result.error || result.status !== 0) throw Error(`Hero rendering failed: ${result.error?.message || result.stderr}`);
}

try {
  const palette = path.join(scratch, 'palette.png');
  run([...inputs, '-filter_complex', `${filters};[animated]palettegen=max_colors=192:stats_mode=diff[palette]`,
    '-map', '[palette]', '-t', String(duration), '-frames:v', '1', palette]);
  run([...inputs, '-i', palette, '-filter_complex', `${filters};[animated][7:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle[gif]`,
    '-map', '[gif]', '-t', String(duration), '-loop', '0', output]);
  console.log(JSON.stringify({ output, width: 1440, height: 480, fps, seconds: duration, bytes: fs.statSync(output).size }));
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
