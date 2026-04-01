import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Locate the schema directory. Checks:
 *  1. Bundled in npm package: mcp-server/schema/ (copied by prepack)
 *  2. Development: sibling to mcp-server/ at webrtc-sdk/schema/
 */
function findSchemaDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(__dirname, '../schema'),          // npm: mcp-server/schema/
    resolve(__dirname, '../../schema'),       // dev: from dist/ or src/
    resolve(__dirname, '../../../schema'),    // dev: nested
  ];
  for (const dir of candidates) {
    try {
      readdirSync(dir);
      return dir;
    } catch {
      // continue
    }
  }
  throw new Error('Could not locate schema directory');
}

/** Locate AGENTS.md. Checks:
 *  1. Bundled in npm package: mcp-server/AGENTS.md (copied by prepack)
 *  2. Development: sibling to mcp-server/ at webrtc-sdk/AGENTS.md
 */
function findAgentsMd(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(__dirname, '../AGENTS.md'),       // npm: mcp-server/AGENTS.md
    resolve(__dirname, '../../AGENTS.md'),    // dev: from dist/ or src/
    resolve(__dirname, '../../../AGENTS.md'), // dev: nested
  ];
  for (const path of candidates) {
    try {
      readFileSync(path, 'utf-8');
      return path;
    } catch {
      // continue
    }
  }
  throw new Error('Could not locate AGENTS.md');
}

const SCHEMA_DIR = findSchemaDir();
const AGENTS_MD = findAgentsMd();

function readFileSafe(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return `Error: could not read ${path}`;
  }
}

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => basename(f, '.json'));
}

export function registerResources(server: McpServer) {
  // AGENTS.md — the main guide
  server.resource('agents-guide', 'agents://guide', async () => ({
    contents: [
      {
        uri: 'agents://guide',
        mimeType: 'text/markdown',
        text: readFileSafe(AGENTS_MD),
      },
    ],
  }));

  // Top-level schemas
  for (const name of listJsonFiles(SCHEMA_DIR)) {
    const uri = `schema://root/${name}`;
    server.resource(name, uri, async () => ({
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: readFileSafe(join(SCHEMA_DIR, `${name}.json`)),
        },
      ],
    }));
  }

  // Component schemas
  const componentsDir = join(SCHEMA_DIR, 'components');
  for (const name of listJsonFiles(componentsDir)) {
    const uri = `schema://component/${name}`;
    server.resource(`component:${name}`, uri, async () => ({
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: readFileSafe(join(componentsDir, `${name}.json`)),
        },
      ],
    }));
  }
}

/** Build an index of all available schemas for the toolkit tool */
export function buildSchemaIndex(): string {
  const lines: string[] = ['# Available Schemas', ''];

  lines.push('## Root Schemas');
  for (const name of listJsonFiles(SCHEMA_DIR)) {
    const schema = JSON.parse(readFileSafe(join(SCHEMA_DIR, `${name}.json`)));
    lines.push(`- **${name}** — ${schema.title || name}: ${schema.description || ''}`);
  }

  lines.push('', '## Component Schemas');
  const componentsDir = join(SCHEMA_DIR, 'components');
  for (const name of listJsonFiles(componentsDir)) {
    const schema = JSON.parse(readFileSafe(join(componentsDir, `${name}.json`)));
    lines.push(`- **component:${name}** — ${schema.title || name}: ${schema.description || ''}`);
  }

  return lines.join('\n');
}

/** Fetch a single schema by name, with optional prefix */
export function getSchema(name: string): string | null {
  // Try prefixed: "component:audio-device"
  if (name.startsWith('component:')) {
    const schemaName = name.slice('component:'.length);
    const path = join(SCHEMA_DIR, 'components', `${schemaName}.json`);
    return existsSync(path) ? readFileSafe(path) : null;
  }

  // Try root schema
  const rootPath = join(SCHEMA_DIR, `${name}.json`);
  if (existsSync(rootPath)) return readFileSafe(rootPath);

  // Try component without prefix
  const compPath = join(SCHEMA_DIR, 'components', `${name}.json`);
  if (existsSync(compPath)) return readFileSafe(compPath);

  return null;
}

/** Read AGENTS.md */
export function getAgentsGuide(): string {
  return readFileSafe(AGENTS_MD);
}
