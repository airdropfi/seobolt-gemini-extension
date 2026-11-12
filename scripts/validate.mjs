#!/usr/bin/env node
/**
 * Validates this Gemini CLI extension against the format Google documents. No dependencies.
 *
 *   node scripts/validate.mjs            errors exit 1
 *   node scripts/validate.mjs --strict   warnings exit 1 too
 *
 * Rules are copied from, as read on 2026-10-27:
 *   https://geminicli.com/docs/extensions/reference/        (gemini-extension.json, commands/, GEMINI.md, variables)
 *   https://geminicli.com/docs/tools/mcp-server/            (mcpServers keys, httpUrl, OAuth discovery)
 *   https://geminicli.com/docs/cli/custom-commands/         (TOML v1: prompt required, description optional, {{args}}, !{...})
 *   https://geminicli.com/docs/extensions/releasing/        (gallery: public repo, topic gemini-cli-extension, manifest at the root)
 * `gemini extensions install <path>` is the authority; this script lets CI and the extension repo check without the CLI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_KEYS = ['name', 'version', 'description', 'mcpServers', 'contextFileName', 'excludeTools', 'migratedTo', 'plan', 'settings', 'themes'];
// Every MCP server option the docs list, except `trust`, which extensions may not set.
const SERVER_KEYS = ['command', 'args', 'env', 'cwd', 'url', 'httpUrl', 'headers', 'tcp', 'timeout', 'includeTools', 'excludeTools', 'oauth', 'authProviderType', 'targetAudience', 'targetServiceAccount', 'description'];
const TRANSPORT_KEYS = ['command', 'url', 'httpUrl'];
const COMMAND_KEYS = ['prompt', 'description'];

const SYSTEM_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES = 128;
const SECRET = /(sk_live_|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{20,})/;
const LOCAL_PATH = /(\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+|C:\\Users\\)/;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function makeReport() {
  const errors = [];
  const warnings = [];
  return { errors, warnings, error: (m) => errors.push(m), warn: (m) => warnings.push(m) };
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The TOML subset a Gemini command file uses: `key = "single line"` and `key = """multi line"""`, nothing else.
 * Returns { fields } or { error }. A file that needs more than this is rejected rather than half-parsed.
 */
export function parseCommandToml(text) {
  const fields = {};
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(.*)$/.exec(line);
    if (!m) return { error: `line ${i + 1}: expected key = value` };
    const [, key, rest] = m;
    if (key in fields) return { error: `line ${i + 1}: duplicate key "${key}"` };
    if (rest.startsWith('"""')) {
      const body = [];
      let first = rest.slice(3);
      let closed = false;
      if (first.includes('"""')) {
        if (!first.endsWith('"""') || first.indexOf('"""') !== first.length - 3) return { error: `line ${i + 1}: text after the closing """` };
        if (first.includes('\\')) return { error: `key "${key}": backslash in a basic string is an escape sequence; avoid it` };
        fields[key] = first.slice(0, -3);
        continue;
      }
      if (first !== '') body.push(first);
      for (i = i + 1; i < lines.length; i++) {
        const idx = lines[i].indexOf('"""');
        if (idx === -1) {
          body.push(lines[i]);
          continue;
        }
        if (lines[i].slice(idx + 3).trim() !== '') return { error: `line ${i + 1}: text after the closing """` };
        body.push(lines[i].slice(0, idx));
        closed = true;
        break;
      }
      if (!closed) return { error: `key "${key}": unterminated """ string` };
      const value = body.join('\n');
      if (value.includes('\\')) return { error: `key "${key}": backslash in a basic string is an escape sequence; avoid it` };
      fields[key] = value;
    } else if (/^"([^"\\]*)"\s*(#.*)?$/.test(rest)) {
      fields[key] = /^"([^"\\]*)"/.exec(rest)[1];
    } else {
      return { error: `line ${i + 1}: key "${key}" must be a "string" or a """multi-line string"""` };
    }
  }
  return { fields };
}

function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(root);
  return out;
}

export function validateExtension(root) {
  const report = makeReport();
  const manifestFile = path.join(root, 'gemini-extension.json');
  if (!fs.existsSync(manifestFile)) {
    report.error('gemini-extension.json: not found in the extension root (the gallery and the CLI both need it there)');
    return report;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch (e) {
    report.error(`gemini-extension.json: Invalid JSON syntax: ${e.message}`);
    return report;
  }
  if (!isObject(manifest)) {
    report.error('gemini-extension.json: must be a JSON object');
    return report;
  }

  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_KEYS.includes(key)) report.warn(`gemini-extension.json: unknown top-level field "${key}"`);
  }
  if (!isNonEmptyString(manifest.name)) report.error('gemini-extension.json: name is required');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.name)) report.error(`gemini-extension.json: name "${manifest.name}" must be lowercase letters and digits with dashes (no underscores or spaces)`);
  if (!isNonEmptyString(manifest.version) || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(manifest.version)) report.error('gemini-extension.json: version must be semver, for example 1.0.0');
  if (!isNonEmptyString(manifest.description)) report.error('gemini-extension.json: description is required (the gallery shows it)');
  else if (manifest.description.length > 300) report.warn('gemini-extension.json: description is long for a gallery card (over 300 characters)');

  // MCP servers
  if (!isObject(manifest.mcpServers) || Object.keys(manifest.mcpServers).length === 0) {
    report.error('gemini-extension.json: mcpServers must list at least one server');
  } else {
    for (const [name, server] of Object.entries(manifest.mcpServers)) {
      const at = `mcpServers.${name}`;
      if (!isObject(server)) {
        report.error(`${at}: must be an object`);
        continue;
      }
      if (name.includes('_')) report.warn(`${at}: server names with "_" are ambiguous in the CLI's tool prefix; use dashes or none`);
      for (const key of Object.keys(server)) {
        if (key === 'trust') report.error(`${at}: "trust" is not supported in an extension manifest`);
        else if (!SERVER_KEYS.includes(key)) report.warn(`${at}: unknown field "${key}"`);
      }
      const transports = TRANSPORT_KEYS.filter((k) => server[k] !== undefined);
      if (transports.length === 0) report.error(`${at}: needs one of command, url (SSE) or httpUrl (streamable HTTP)`);
      if (transports.length > 1) report.warn(`${at}: ${transports.join(' and ')} are all set; the CLI uses httpUrl, then url, then command`);
      for (const key of ['url', 'httpUrl']) {
        if (server[key] === undefined) continue;
        if (!isHttpsUrl(server[key])) report.error(`${at}.${key}: "${server[key]}" is not an absolute https URL`);
        else if (new URL(server[key]).pathname !== '/' && server[key].endsWith('/')) {
          report.error(`${at}.${key}: a trailing slash breaks OAuth discovery (the resource must match exactly)`);
        }
      }
      if (server.command !== undefined && /\b(npx|bunx|uvx|pnpm|yarn|pipx)\b/.test(String(server.command)) && !/@\d/.test(JSON.stringify(server.args ?? []))) {
        report.error(`${at}: a package launcher must pin an exact version`);
      }
      if (server.headers !== undefined) {
        if (!isObject(server.headers)) report.error(`${at}.headers: must be an object`);
        else {
          for (const [h, v] of Object.entries(server.headers)) {
            if (typeof v === 'string' && !/\$\{?[A-Z_]+\}?/.test(v) && /^(authorization|x-api-key|api-key)$/i.test(h)) {
              report.error(`${at}.headers.${h}: a literal credential in a public repo; use OAuth discovery or a declared setting`);
            }
          }
        }
      }
      for (const key of ['includeTools', 'excludeTools']) {
        if (server[key] !== undefined && !(Array.isArray(server[key]) && server[key].every((t) => typeof t === 'string'))) {
          report.error(`${at}.${key}: must be an array of tool names`);
        }
      }
      if (server.oauth !== undefined && !isObject(server.oauth)) report.error(`${at}.oauth: must be an object`);
    }
  }

  // Context file
  const contextName = manifest.contextFileName ?? 'GEMINI.md';
  if (!isNonEmptyString(contextName) || contextName.includes('..') || path.isAbsolute(contextName)) {
    report.error('gemini-extension.json: contextFileName must be a relative path inside the extension');
  } else if (!fs.existsSync(path.join(root, contextName))) {
    report.error(`${contextName}: context file not found`);
  } else if (fs.readFileSync(path.join(root, contextName), 'utf8').trim().length < 200) {
    report.warn(`${contextName}: context file is very short`);
  }

  // Commands
  const commandsDir = path.join(root, 'commands');
  const commands = [];
  if (fs.existsSync(commandsDir)) {
    for (const file of listFiles(commandsDir)) {
      const rel = path.relative(commandsDir, file);
      if (!file.endsWith('.toml')) {
        report.error(`commands/${rel}: only .toml files are read as commands`);
        continue;
      }
      const parsed = parseCommandToml(fs.readFileSync(file, 'utf8'));
      if (parsed.error) {
        report.error(`commands/${rel}: ${parsed.error}`);
        continue;
      }
      for (const key of Object.keys(parsed.fields)) {
        if (!COMMAND_KEYS.includes(key)) report.warn(`commands/${rel}: unknown field "${key}"`);
      }
      if (!isNonEmptyString(parsed.fields.prompt)) report.error(`commands/${rel}: prompt is required`);
      if (!isNonEmptyString(parsed.fields.description)) report.warn(`commands/${rel}: description is missing (the /help menu shows a generic one)`);
      if (/!\{/.test(parsed.fields.prompt ?? '') || /@\{/.test(parsed.fields.prompt ?? '')) {
        report.error(`commands/${rel}: !{...} runs a shell command and @{...} reads files; this extension's commands must only talk to the MCP tools`);
      }
      commands.push({ name: rel.replace(/\.toml$/, '').split(path.sep).join(':'), file: rel, fields: parsed.fields });
    }
  } else {
    report.warn('commands/: no commands directory');
  }

  // README, LICENSE, icon, hygiene
  const readme = path.join(root, 'README.md');
  if (!fs.existsSync(readme)) report.error('README.md: missing');
  else if (fs.readFileSync(readme, 'utf8').split(/\s+/).length < 80) report.error('README.md: too short to explain install, sign-in and cost');
  if (!fs.existsSync(path.join(root, 'LICENSE'))) report.error('LICENSE: missing');

  const files = listFiles(root);
  if (files.length > MAX_FILES) report.error(`extension has ${files.length} files (over ${MAX_FILES})`);
  for (const file of files) {
    const rel = path.relative(root, file);
    const base = path.basename(file);
    if (SYSTEM_FILES.has(base)) report.error(`${rel}: system file`);
    if (base === '.env' || base.startsWith('.env.') || /\.(pem|key)$/.test(base)) report.error(`${rel}: looks like a secret file`);
    const stat = fs.statSync(file);
    if (stat.size > MAX_FILE_BYTES && !/\.(png|jpe?g|webp)$/i.test(base)) report.error(`${rel}: ${stat.size} bytes is too big for a text file`);
    if (/\.(md|json|toml|mjs|txt|yml|yaml)$/.test(base) || base === 'LICENSE') {
      const text = fs.readFileSync(file, 'utf8');
      if (rel !== path.join('scripts', 'validate.mjs') && SECRET.test(text)) report.error(`${rel}: contains something that looks like a credential`);
      if (LOCAL_PATH.test(text)) report.error(`${rel}: contains a local filesystem path`);
    }
  }

  return { ...report, manifest, commands };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { errors, warnings, commands = [] } = validateExtension(root);
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length === 0) console.log(`ok: gemini-extension.json, ${commands.length} commands (${commands.map((c) => `/${c.name}`).join(', ')})`);
  process.exit(errors.length > 0 || (process.argv.includes('--strict') && warnings.length > 0) ? 1 : 0);
}
