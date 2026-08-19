import { readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';

const backendRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(backendRoot, '..');
const frontendRoot = path.join(projectRoot, 'frontend');
const failures = [];
let checkedJavaScript = 0;
let checkedHtml = 0;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

function compile(source, filename) {
  try {
    new vm.Script(source, { filename });
    checkedJavaScript += 1;
  } catch (error) {
    failures.push(`${filename}: ${error.message}`);
  }
}

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

const files = await walk(projectRoot);

for (const file of files.filter(file => /\.(?:js|mjs)$/.test(file))) {
  const relativeFile = path.relative(projectRoot, file);
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  checkedJavaScript += 1;
  if (result.status !== 0) failures.push(`${relativeFile}: ${(result.stderr || result.stdout).trim()}`);
}

for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  const relativeHtml = path.relative(projectRoot, file);
  checkedHtml += 1;

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attributes = match[1];
    const sourceMatch = attributes.match(/\bsrc=["']([^"']+)["']/i);
    if (sourceMatch) {
      const source = sourceMatch[1];
      if (/^(?:https?:)?\/\//i.test(source)) continue;
      const localFile = path.resolve(path.dirname(file), source.split(/[?#]/)[0]);
      if (!await exists(localFile)) failures.push(`${relativeHtml}: missing script ${source}`);
      continue;
    }

    const typeMatch = attributes.match(/\btype=["']([^"']+)["']/i);
    if (typeMatch && !['text/javascript', 'application/javascript', 'module'].includes(typeMatch[1])) continue;
    compile(match[2], `${relativeHtml}#inline-script`);
  }

  for (const match of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1];
    if (/^(?:https?:)?\/\//i.test(href)) continue;
    const localFile = path.resolve(path.dirname(file), href.split(/[?#]/)[0]);
    if (!await exists(localFile)) failures.push(`${relativeHtml}: missing stylesheet ${href}`);
  }
}

if (failures.length) {
  console.error(`Verification failed (${failures.length} issue(s)):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Verification passed: ${checkedJavaScript} JavaScript blocks/files and ${checkedHtml} HTML files.`);
