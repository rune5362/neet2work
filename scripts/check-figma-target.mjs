import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(process.cwd(), '.env');
const FIGMA_API_BASE_URL = 'https://api.figma.com/v1';

function loadDotEnv(path) {
  try {
    const content = readFileSync(path, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) continue;

      const key = line.slice(0, equalsIndex).trim();
      let value = line.slice(equalsIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function normalizeFileKey(value) {
  const input = value.trim();
  const match = input.match(/figma\.com\/(?:file|design)\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : input;
}

function normalizeNodeId(value) {
  const input = value.trim();

  let rawNodeId = input;
  try {
    const url = new URL(input);
    rawNodeId = url.searchParams.get('node-id') ?? input;
  } catch {
    const match = input.match(/node-id=([^&]+)/i);
    if (match) rawNodeId = match[1];
  }

  return decodeURIComponent(rawNodeId.split('&')[0]).replaceAll('-', ':');
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} is missing. Add it to .env first.`);
    process.exitCode = 1;
    return null;
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value || null;
}

function findTextNodeByName(node, name) {
  if (node.type === 'TEXT' && node.name === name) {
    return node;
  }

  for (const child of node.children ?? []) {
    const found = findTextNodeByName(child, name);
    if (found) return found;
  }

  return null;
}

async function readErrorBody(response) {
  try {
    const body = await response.json();
    return body.err || body.message || JSON.stringify(body);
  } catch {
    return await response.text();
  }
}

loadDotEnv(ENV_FILE);

const token = requiredEnv('FIGMA_ACCESS_TOKEN');
const fileKeyInput = requiredEnv('FIGMA_FILE_KEY');
const nodeIdInput = requiredEnv('FIGMA_TARGET_NODE_ID');
const textLayerName = optionalEnv('FIGMA_TARGET_TEXT_LAYER_NAME');

if (!token || !fileKeyInput || !nodeIdInput) {
  process.exit(1);
}

const fileKey = normalizeFileKey(fileKeyInput);
const nodeId = normalizeNodeId(nodeIdInput);
const endpoint = `${FIGMA_API_BASE_URL}/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(
  nodeId,
)}`;

const response = await fetch(endpoint, {
  headers: {
    'X-Figma-Token': token,
  },
});

if (!response.ok) {
  const message = await readErrorBody(response);
  console.error(`Figma target check failed: HTTP ${response.status}`);
  if (message) console.error(`Reason: ${message}`);

  if (response.status === 401 || response.status === 403) {
    console.error('Check that the token is valid, has file_content:read scope, and can access the file.');
  }
  if (response.status === 404) {
    console.error('Check that FIGMA_FILE_KEY and FIGMA_TARGET_NODE_ID point to an existing file/layer.');
  }

  process.exit(1);
}

const data = await response.json();
const target = data.nodes?.[nodeId]?.document;

if (!target) {
  console.error(`Figma file was reachable, but node ${nodeId} was not found.`);
  process.exit(1);
}

console.log('Figma target check passed.');
console.log(`File: ${data.name ?? '(unnamed)'}`);
console.log(`Node: ${target.name} (${target.type})`);
console.log(`Node ID: ${nodeId}`);

if (target.type !== 'TEXT') {
  console.log('Note: target is not a TEXT node. A plugin can still use it as a container if needed.');
}

if (textLayerName) {
  const textNode = findTextNodeByName(target, textLayerName);

  if (!textNode) {
    console.error(`Text layer "${textLayerName}" was not found inside node ${nodeId}.`);
    process.exit(1);
  }

  console.log(`Text layer: ${textNode.name} (${textNode.type})`);
  console.log('Text layer lookup passed.');
}
