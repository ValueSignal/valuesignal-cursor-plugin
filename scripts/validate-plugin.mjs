#!/usr/bin/env node
/**
 * Validate plugin layout (Cursor marketplace template rules).
 * Usage: node scripts/validate-plugin.mjs [repo-root]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));

const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplaceNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}
function addWarning(message) {
  warnings.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON (${filePath}): ${error.message}`);
    return null;
  }
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  const closingIndex = normalized.indexOf('\n---\n', 4);
  if (closingIndex === -1) return null;
  const fields = {};
  for (const line of normalized.slice(4, closingIndex).split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  }
  return files;
}

async function validateFrontmatterFile(filePath, componentName, requiredKeys, pluginName) {
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = parseFrontmatter(content);
  const relativeFile = path.relative(repoRoot, filePath);
  if (!parsed) {
    addError(`${pluginName}: ${componentName} missing YAML frontmatter: ${relativeFile}`);
    return;
  }
  for (const key of requiredKeys) {
    if (!parsed[key]?.length) {
      addError(`${pluginName}: ${componentName} missing "${key}" in frontmatter: ${relativeFile}`);
    }
  }
}

async function validateComponentFrontmatter(pluginDir, pluginName) {
  for (const [subdir, component, keys, match] of [
    ['rules', 'rule', ['description'], (f) => /\.(md|mdc|markdown)$/i.test(f)],
    ['skills', 'skill', ['name', 'description'], (f) => path.basename(f) === 'SKILL.md'],
    ['commands', 'command', ['name', 'description'], (f) => /\.(md|mdc|markdown|txt)$/i.test(f)],
  ]) {
    const dir = path.join(pluginDir, subdir);
    if (!(await pathExists(dir))) continue;
    for (const file of await walkFiles(dir)) {
      if (!match(file)) continue;
      await validateFrontmatterFile(file, component, keys, pluginName);
    }
  }
}

async function main() {
  console.log(`Validating: ${repoRoot}\n`);

  const marketplacePath = path.join(repoRoot, '.cursor-plugin', 'marketplace.json');
  const marketplace = await readJsonFile(marketplacePath, 'Marketplace manifest');
  if (!marketplace) {
    summarize();
    return;
  }

  if (typeof marketplace.name !== 'string' || !marketplaceNamePattern.test(marketplace.name)) {
    addError('Marketplace "name" must be lowercase kebab-case.');
  }
  if (!marketplace.owner?.name) {
    addError('Marketplace "owner.name" is required.');
  }
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError('Marketplace "plugins" must be a non-empty array.');
    summarize();
    return;
  }

  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;
    if (!entry?.name || !pluginNamePattern.test(entry.name)) {
      addError(`${label}.name invalid`);
      continue;
    }
    const pluginDir = path.resolve(repoRoot, entry.source || '.');
    if (!(await pathExists(pluginDir))) {
      addError(`${label}: plugin directory missing: ${entry.source}`);
      continue;
    }

    const manifestPath = path.join(pluginDir, '.cursor-plugin', 'plugin.json');
    const pluginManifest = await readJsonFile(manifestPath, `${entry.name} plugin.json`);
    if (!pluginManifest) continue;

    if (pluginManifest.name !== entry.name) {
      addError(`${entry.name}: marketplace name !== plugin.json name ("${pluginManifest.name}")`);
    }

    if (pluginManifest.logo && !pluginManifest.logo.startsWith('http')) {
      const logoPath = path.join(pluginDir, pluginManifest.logo);
      if (!(await pathExists(logoPath))) {
        addError(`${entry.name}: logo missing at ${pluginManifest.logo}`);
      }
    }

    const mcpPath = path.join(pluginDir, 'mcp.json');
    if (!(await pathExists(mcpPath))) {
      addWarning(`${entry.name}: no mcp.json`);
    } else {
      const serverPath = path.join(pluginDir, 'mcp', 'server.mjs');
      if (!(await pathExists(serverPath))) {
        addError(`${entry.name}: mcp/server.mjs missing`);
      }
    }

    await validateComponentFrontmatter(pluginDir, entry.name);
  }

  summarize();
}

function summarize() {
  if (warnings.length) {
    console.log('Warnings:');
    warnings.forEach((w) => console.log(`  - ${w}`));
    console.log('');
  }
  if (errors.length) {
    console.error('Validation FAILED:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('Validation passed.');
}

await main();
