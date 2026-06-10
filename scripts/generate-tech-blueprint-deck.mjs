import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '../.codex/skills/presentation-skill/node_modules/sharp/lib/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(repoRoot, '.codex', 'skills', 'presentation-skill');
const timestamp = process.env.NEET2WORK_DECK_TIMESTAMP ?? '20260609-1606';
const workspace = path.join(skillRoot, 'decks', `neet2work__tech-blueprint-pd-cp__${timestamp}`);
const previous = path.join(skillRoot, 'decks', 'neet2work__pd-cp__20260609-1541');
const assets = path.join(workspace, 'assets');
const conceptDir = path.join(assets, 'concept');
const screenshotsDir = path.join(assets, 'screenshots');
const diagramsDir = path.join(assets, 'diagrams-png');
const buildDir = path.join(workspace, 'build');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(workspace, name), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function xml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);
}

function blueprintSvg(kind, title, subtitle, nodes, accent = '#22d3ee') {
  const width = 1920;
  const height = 1080;
  const grid = [];
  for (let x = 0; x <= width; x += 80) {
    grid.push(`<path d="M ${x} 0 L ${x} ${height}" stroke="#17324a" stroke-width="1" opacity="0.45"/>`);
  }
  for (let y = 0; y <= height; y += 80) {
    grid.push(`<path d="M 0 ${y} L ${width} ${y}" stroke="#17324a" stroke-width="1" opacity="0.45"/>`);
  }

  const nodeEls = nodes.map((node, index) => {
    const [x, y, label, color = accent] = node;
    return `<g opacity="0.96">
      <rect x="${x}" y="${y}" width="260" height="86" rx="16" fill="#07111f" stroke="${color}" stroke-width="3"/>
      <circle cx="${x + 34}" cy="${y + 43}" r="13" fill="${color}"/>
      <text x="${x + 62}" y="${y + 51}" fill="#e5f6ff" font-family="Segoe UI, Arial" font-size="27" font-weight="700">${xml(label)}</text>
      <text x="${x + 18}" y="${y + 108}" fill="${color}" font-family="Consolas, monospace" font-size="18" opacity="0.85">0${index + 1} / ${xml(kind)}</text>
    </g>`;
  }).join('');

  const links = nodes.slice(0, -1).map((node, index) => {
    const next = nodes[index + 1];
    return `<path d="M ${node[0] + 260} ${node[1] + 43} C ${node[0] + 390} ${node[1] + 43}, ${next[0] - 130} ${next[1] + 43}, ${next[0]} ${next[1] + 43}" fill="none" stroke="#5eead4" stroke-width="4" opacity="0.52" stroke-dasharray="14 12"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="r" cx="55%" cy="42%" r="70%">
        <stop offset="0" stop-color="#12345a"/>
        <stop offset="0.48" stop-color="#0b1828"/>
        <stop offset="1" stop-color="#020617"/>
      </radialGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#r)"/>
    ${grid.join('')}
    <path d="M 130 220 L 1790 220 L 1790 850 L 130 850 Z" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.35"/>
    <path d="M 150 872 L 1770 872" stroke="#f59e0b" stroke-width="6" opacity="0.75"/>
    <text x="130" y="130" fill="#f8fafc" font-family="Segoe UI, Arial" font-size="72" font-weight="800">${xml(title)}</text>
    <text x="134" y="182" fill="#93c5fd" font-family="Segoe UI, Arial" font-size="30" font-weight="600">${xml(subtitle)}</text>
    <g filter="url(#glow)">${links}${nodeEls}</g>
    <text x="130" y="990" fill="#bae6fd" font-family="Consolas, monospace" font-size="24" opacity="0.7">NEET2WORK / MOCK-FIRST / API BOUNDARY / FALLBACK READY</text>
    <text x="1360" y="990" fill="#fbbf24" font-family="Consolas, monospace" font-size="24" opacity="0.7">TECH BLUEPRINT</text>
  </svg>`;
}

async function writePng(file, svg) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(conceptDir, file));
}

const sourceGroups = {
  readme: ['README.md'],
  arch: ['docs/ARCHITECTURE.md'],
  api: ['docs/API_CONTRACT.md'],
  ai: ['README.md', 'docs/AI_WORKFLOW.md'],
  db: ['docs/DB_API_TEAM_HANDOFF.md'],
};

function slideSet() {
  return [
    { type: 'title', title: 'Neet2Work Tech Blueprint', subtitle: 'Mock-first career platform architecture for jobs, documents, and AI drafting', kicker: 'SYSTEM DESIGN PRESENTATION', footer: 'Product Design + Creative Production + presentation-skill / 2026-06-09', assets: { hero_image: 'assets/concept/cover-blueprint.png' } },
    { type: 'content', variant: 'image-sidebar', title: 'What changed in this rebuild', subtitle: 'A systems blueprint, not a product-report replay', assets: { hero_image: 'assets/concept/cover-blueprint.png' }, image_side: 'right', sections: [{ title: 'Presentation stance', body: ['Developer audience first', 'Boundaries, data flow, and fallback behavior over feature marketing'] }, { title: 'Design stance', body: ['Dark grid, technical map, numbered callouts', 'Screenshots and diagrams used as evidence assets'] }, { title: 'Reuse rule', body: ['Only PNG screenshots and diagram images are reused', 'Text, sequence, and design brief are newly authored'] }], sources: ['Product Design brief', 'Creative Production style route'] },
    { type: 'section', title: 'Why This System Exists', subtitle: 'From career preparation friction to architecture requirements' },
    { type: 'content', variant: 'matrix', title: 'The product problem becomes a systems problem', subtitle: 'Neet2Work has to connect user intent, evidence, and generation without making the demo fragile', quadrants: [{ title: 'Job signal', body: 'Users need to interpret postings and requirements.' }, { title: 'Evidence', body: 'Profiles, resumes, and references must become reusable input.' }, { title: 'Drafting', body: 'AI output needs planning, evidence mapping, and revision.' }, { title: 'Stability', body: 'The final demo cannot depend on live DB, AI, or storage.' }], sources: sourceGroups.readme },
    { type: 'content', variant: 'timeline', title: 'Mock-first is the core architecture decision', subtitle: 'The runtime is designed around graceful absence of external systems', milestones: [{ label: '1', title: 'UI reachable', body: 'Screens work with demo data and local assets.' }, { label: '2', title: 'API stable', body: 'Frontend talks to backend DTOs only.' }, { label: '3', title: 'Router owned', body: 'AI can be Codex, Gemini, local, or fallback.' }, { label: '4', title: 'Attach later', body: 'DB, R2, and collection paths extend the same boundaries.' }], sources: sourceGroups.arch },
    { type: 'content', variant: 'table', title: 'Architecture requirements derived from the demo', subtitle: 'The product story creates explicit implementation constraints', table: { headers: ['Requirement', 'Architecture response', 'Why it matters'], rows: [['No external dependency for presentation', 'local JSON / in-memory / fallback demo', 'Demo path remains stable'], ['AI output must be traceable', 'workflow metadata and fallback flags', 'Presenter can explain real vs fallback'], ['Documents are reusable evidence', 'document/profile/application set lifecycle', 'AI workflow has structured context'], ['Job collection evolves later', 'collector artifact then import boundary', 'Crawler risk stays outside runtime UI']] }, sources: sourceGroups.readme },
    { type: 'content', variant: 'kpi-hero', title: 'One operating principle', subtitle: 'If an external system disappears, the product should explain the state and continue the demo', kpi: 'Fallback is a feature', kicker: 'MOCK-FIRST CONTRACT', body: 'The app preserves the user-facing path while exposing dependency state through health, metadata, and deterministic fallback behavior.', sources: sourceGroups.arch },
    { type: 'content', variant: 'timeline', title: 'System promise in one path', subtitle: 'A user action crosses boundaries without leaking implementation details', milestones: [{ label: '1', title: 'Job signal', body: 'Choose the public posting context.' }, { label: '2', title: 'Evidence', body: 'Attach candidate profile and documents.' }, { label: '3', title: 'AI router', body: 'Plan and draft through provider routing.' }, { label: '4', title: 'Document state', body: 'Save output through document lifecycle.' }], summary_callout: 'The same path works whether the provider is real or fallback.', sources: sourceGroups.ai },
    { type: 'section', title: 'Product Surface As Boundary', subtitle: 'Screens are treated as evidence of contracts, not feature screenshots' },
    { type: 'content', variant: 'image-sidebar', title: 'Home screen: entry point and product framing', subtitle: 'The first boundary is expectation setting', assets: { hero_image: 'assets/screenshots/home.png' }, image_side: 'left', sections: [{ title: 'What the screen proves', body: ['The app presents a coherent career-preparation flow', 'The demo can start without live backend dependencies'] }, { title: 'Blueprint reading', body: ['Home routes users into jobs, documents, and AI workflow', 'It is a navigation surface over runtime contracts'] }], sources: sourceGroups.readme },
    { type: 'content', variant: 'image-sidebar', title: 'Jobs screen: public signal boundary', subtitle: 'The UI consumes normalized public job DTOs', assets: { hero_image: 'assets/screenshots/jobs.png' }, image_side: 'right', sections: [{ title: 'Surface behavior', body: ['Search, filter, detail drawer, pagination, URL state'] }, { title: 'Implementation boundary', body: ['Collector internals stay out of public API responses', 'Frontend receives allowlisted job fields only'] }], sources: sourceGroups.api },
    { type: 'content', variant: 'image-sidebar', title: 'AI analysis screen: evidence input boundary', subtitle: 'The composer assembles job context and candidate context', assets: { hero_image: 'assets/screenshots/ai-analysis.png' }, image_side: 'left', sections: [{ title: 'Surface behavior', body: ['Company, role, prompt, tone, references, attachments'] }, { title: 'System responsibility', body: ['Backend turns inputs into plan/draft/revise requests', 'Fallback metadata keeps the result explainable'] }], sources: sourceGroups.ai },
    { type: 'content', variant: 'image-sidebar', title: 'Documents screen: lifecycle boundary', subtitle: 'The document library is a career data workspace', assets: { hero_image: 'assets/screenshots/documents.png' }, image_side: 'right', sections: [{ title: 'Surface behavior', body: ['Profiles, resumes, self-introductions, application sets'] }, { title: 'System responsibility', body: ['Copy, protect, edit, delete lifecycle', 'Reusable evidence for AI drafting'] }], sources: sourceGroups.readme },
    { type: 'content', variant: 'image-sidebar', title: 'Login screen: protected route boundary', subtitle: 'Authentication protects the career workspace', assets: { hero_image: 'assets/screenshots/login.png' }, image_side: 'left', sections: [{ title: 'Surface behavior', body: ['Login, session, protected account access'] }, { title: 'System responsibility', body: ['JWT access token and refresh token path', 'Rate limit and account security summary'] }], sources: sourceGroups.readme },
    { type: 'content', variant: 'matrix', title: 'Screen-to-boundary map', subtitle: 'Each visible surface maps to a backend responsibility', quadrants: [{ title: 'Jobs', body: 'Public DTO and collection/import boundary' }, { title: 'AI analysis', body: 'Prompt planning and provider routing boundary' }, { title: 'Documents', body: 'Lifecycle, snapshot, and reusable evidence boundary' }, { title: 'Auth', body: 'Protected session and account boundary' }], sources: sourceGroups.api },
    { type: 'content', variant: 'table', title: 'What the frontend is not allowed to know', subtitle: 'The UI stays useful because implementation details remain behind APIs', table: { headers: ['Hidden from frontend', 'Owned by', 'Visible signal'], rows: [['Prisma queries', 'backend storage/service', 'DTO fields'], ['Provider credential state', 'AI router', 'aiMeta and fallback reason'], ['Collector raw HTML', 'import pipeline', 'normalized job posting'], ['File parsing implementation', 'resume extract route', 'extracted text preview']] }, sources: sourceGroups.arch },
    { type: 'section', title: 'Architecture Blueprint', subtitle: 'Runtime, workflow, dependencies, ERD, and services as system evidence' },
    { type: 'content', variant: 'image-sidebar', title: 'Architecture section visual route', subtitle: 'Creative Production concept asset for the technical map chapter', assets: { hero_image: 'assets/concept/architecture-map.png' }, image_side: 'right', sections: [{ title: 'Visual language', body: ['System map instead of product brochure', 'Callouts and grid rhythm over card repetition'] }, { title: 'Reading order', body: ['Runtime boundary', 'AI/data sequences', 'Dependency and ERD evidence'] }], sources: ['Creative Production concept asset'] },
    { type: 'content', variant: 'scientific-figure', title: 'System overview', subtitle: 'The high-level map of user, frontend, backend, and optional integrations', figures: [{ path: 'assets/diagrams-png/system-overview.png', label: 'A', title: 'Generated PNG diagram', caption: 'Rendered from repository docs; inserted as PNG for PowerPoint compatibility.' }], interpretation: 'Neet2Work is best understood as a boundary-preserving system.', sources: ['docs/generated/diagrams/system-overview.svg'] },
    { type: 'content', variant: 'scientific-figure', title: 'Runtime architecture', subtitle: 'Where fallback decisions live', figures: [{ path: 'assets/diagrams-png/architecture-runtime.png', label: 'A', title: 'Runtime map', caption: 'Frontend, Express API, services, storage, Prisma, and provider boundaries.' }], interpretation: 'The runtime keeps fallback behavior inside backend services instead of scattering it through UI components.', sources: ['docs/generated/diagrams/architecture-runtime.svg', 'docs/ARCHITECTURE.md'] },
    { type: 'content', variant: 'table', title: 'Runtime boundary contract', subtitle: 'A developer can change internals without rewriting the user flow', table: { headers: ['Layer', 'Owns', 'Must not leak'], rows: [['Frontend', 'route state, user interaction, API calls', 'Prisma, provider credentials, raw crawler data'], ['Routes', 'HTTP validation and response shape', 'business branching'], ['Services', 'domain logic and fallback decisions', 'transport details'], ['Storage/database', 'persistence and lifecycle', 'UI state assumptions']] }, sources: sourceGroups.arch },
    { type: 'content', variant: 'scientific-figure', title: 'AI draft workflow sequence', subtitle: 'Plan, draft, and revise are a backend-orchestrated sequence', figures: [{ path: 'assets/diagrams-png/ai-draft-workflow-sequence.png', label: 'A', title: 'AI sequence', caption: 'AI workflow request path and provider response handling.' }], interpretation: 'Backend controls metadata, fallback flags, evidence maps, and revision continuity.', sources: ['docs/generated/diagrams/ai-draft-workflow-sequence.svg'] },
    { type: 'content', variant: 'scientific-figure', title: 'Document create sequence', subtitle: 'Document creation preserves profile/job context for later reuse', figures: [{ path: 'assets/diagrams-png/sequence-document-create.png', label: 'A', title: 'Document sequence', caption: 'Create document flow through UI, API, service, and storage.' }], interpretation: 'Documents are connected to candidate profile, job context, and lifecycle state.', sources: ['docs/generated/diagrams/sequence-document-create.svg'] },
    { type: 'content', variant: 'scientific-figure', title: 'Dependency overview', subtitle: 'A summary graph is more useful than a whole-repo hairball', figures: [{ path: 'assets/diagrams-png/dependency-overview.png', label: 'A', title: 'Dependency overview', caption: 'Repository-generated dependency overview PNG.' }], interpretation: 'The dependency graph shows architectural separation at a readable scale.', sources: ['docs/generated/dependencies/overview.svg'] },
    { type: 'content', variant: 'scientific-figure', title: 'Documents/profile dependency', subtitle: 'The core product surface crosses page, API client, and type boundaries', figures: [{ path: 'assets/diagrams-png/documents-profile.png', label: 'A', title: 'Documents/profile graph', caption: 'Dependency slice for document and profile flows.' }], interpretation: 'Document lifecycle changes need frontend and backend contracts to move together.', sources: ['docs/generated/dependencies/documents-profile.svg'] },
    { type: 'content', variant: 'scientific-figure', title: 'ERD: document workspace', subtitle: 'Career documents carry lifecycle and context, not only body text', figures: [{ path: 'assets/diagrams-png/erd-documents.png', label: 'A', title: 'Documents ERD', caption: 'Candidate profile, application document, and set relationships.' }], interpretation: 'The data model supports reusable career evidence and controlled document state transitions.', sources: ['docs/generated/database/erd-documents.svg'] },
    { type: 'content', variant: 'scientific-figure', title: 'ERD: job postings', subtitle: 'Public job data is normalized before it becomes product data', figures: [{ path: 'assets/diagrams-png/erd-jobs.png', label: 'A', title: 'Jobs ERD', caption: 'Job posting and analysis-related model area.' }], interpretation: 'Collection and import can evolve without exposing crawler internals to the public API.', sources: ['docs/generated/database/erd-jobs.svg'] },
    { type: 'content', variant: 'scientific-figure', title: 'Service class overview', subtitle: 'Service boundaries are the implementation backbone', figures: [{ path: 'assets/diagrams-png/class-services.png', label: 'A', title: 'Service classes', caption: 'Generated class overview from exported TypeScript classes.' }], interpretation: 'The service layer coordinates route contracts, provider routing, storage decisions, and fallback behavior.', sources: ['docs/generated/classes/class-services.svg'] },
    { type: 'content', variant: 'matrix', title: 'Architecture reading guide', subtitle: 'The diagram chapter supports four implementation claims', quadrants: [{ title: 'Contract first', body: 'Routes validate and shape responses.' }, { title: 'Domain middle', body: 'Services own product decisions.' }, { title: 'Storage optional', body: 'DB can be configured without becoming mandatory.' }, { title: 'Provider replaceable', body: 'AI integrations are candidates behind a router.' }], sources: sourceGroups.arch },
    { type: 'section', title: 'Implementation Evidence', subtitle: 'How the blueprint appears in code and verification' },
    { type: 'content', variant: 'image-sidebar', title: 'Implementation section visual route', subtitle: 'Creative Production concept asset for the build evidence chapter', assets: { hero_image: 'assets/concept/implementation-console.png' }, image_side: 'left', sections: [{ title: 'What this chapter proves', body: ['The architecture exists in code boundaries', 'The demo is stable because fallback is intentional'] }, { title: 'Evidence types', body: ['Folder structure', 'API responsibility split', 'AI provider path', 'QA signals'] }], sources: ['Creative Production concept asset'] },
    { type: 'content', variant: 'table', title: 'Monorepo implementation map', subtitle: 'The codebase mirrors frontend/backend responsibility separation', table: { headers: ['Area', 'Path', 'Role'], rows: [['Frontend', 'apps/frontend/src/pages', 'URL-level screens and user flows'], ['API client', 'apps/frontend/src/api', 'backend REST calls only'], ['Backend routes', 'apps/backend/src/routes', 'HTTP validation and response shape'], ['Backend services', 'apps/backend/src/services', 'domain logic, fallback, provider routing'], ['Prisma models', 'apps/backend/prisma/models', 'split schema source of truth']] }, sources: sourceGroups.readme },
    { type: 'content', variant: 'timeline', title: 'Frontend request path', subtitle: 'UI state crosses one explicit boundary before data decisions happen', milestones: [{ label: '1', title: 'Page state', body: 'Screen owns interaction and URL state.' }, { label: '2', title: 'API client', body: 'Typed REST call leaves the frontend.' }, { label: '3', title: 'Route', body: 'Express validates request and response shape.' }, { label: '4', title: 'Service', body: 'Domain logic chooses storage or provider path.' }], summary_callout: 'The frontend never chooses DB, local JSON, memory fallback, or AI fallback directly.', sources: sourceGroups.arch },
    { type: 'content', variant: 'table', title: 'AI provider routing implementation', subtitle: 'The router makes real AI optional without changing the product surface', table: { headers: ['Provider candidate', 'When used', 'Fallback behavior'], rows: [['Codex Bridge', 'app-server/OAuth path is available', 'Try next configured candidate or fallback'], ['Gemini', 'API key/model configured', 'Manual failure falls to demo fallback'], ['Local AI', 'Ollama/OpenAI-compatible endpoint exists', 'Fallback if endpoint unavailable'], ['Hardcoded fallback', 'No provider succeeds', 'Deterministic presentation-safe output']] }, sources: sourceGroups.ai },
    { type: 'content', variant: 'table', title: 'Document parsing implementation', subtitle: 'Uploaded files become text evidence for the AI workflow', table: { headers: ['Format', 'Parser path', 'Presentation contract'], rows: [['TXT/MD', 'UTF-8 text', 'Direct experience or requirement input'], ['DOCX', 'mammoth raw text', 'Structured document text extraction'], ['PDF', 'pdf-parse text layer', 'Rejects image-only scans'], ['Images/legacy DOC', 'Not supported', 'User converts before upload']] }, sources: sourceGroups.readme },
    { type: 'content', variant: 'timeline', title: 'Job collection path stays outside runtime UI', subtitle: 'Collector work is isolated so product routes remain stable', milestones: [{ label: '1', title: 'Public HTML research', body: 'Identify evidence-backed sources.' }, { label: '2', title: 'Collector artifact', body: 'Write normalized JSON, not DB rows.' }, { label: '3', title: 'Import validation', body: 'TypeScript validates contract.' }, { label: '4', title: 'Approved DB write', body: 'Prisma import applies changes when allowed.' }], sources: sourceGroups.readme },
    { type: 'content', variant: 'matrix', title: 'Fallback modes are observable', subtitle: 'The system explains degraded operation instead of hiding it', quadrants: [{ title: 'Missing DB', body: 'Use local JSON or in-memory sample data.' }, { title: 'Missing AI key', body: 'Use deterministic mock/fallback analysis.' }, { title: 'Missing storage', body: 'Keep local/no-op path for demo.' }, { title: 'Missing live sites', body: 'Do not break runtime; preserve artifacts and evidence.' }], sources: sourceGroups.arch },
    { type: 'content', variant: 'table', title: 'Verification evidence', subtitle: 'The deck build follows the same evidence posture', table: { headers: ['Check', 'Expected result', 'Why it matters'], rows: [['PPTX build', '35-45 slides, build/neet2work.pptx', 'Deliverable exists in a fresh workspace'], ['Media inspection', 'PNG/concept assets included, no direct SVG media', 'PowerPoint text rendering remains stable'], ['Render-free QA', 'overflow 0, overlap 0, template tokens 0', 'Slides are structurally safe'], ['Visual render', 'Run when soffice is available', 'Confirms rendered appearance']] }, sources: ['presentation-skill QA policy'] },
    { type: 'content', variant: 'kpi-hero', title: 'Demo stability and expansion', subtitle: 'The technical outcome is a controlled path to real integrations', kpi: 'Stable now, attachable later', kicker: 'FINAL BLUEPRINT', body: 'Neet2Work can demonstrate the complete user journey today while leaving clear integration points for Supabase/PostgreSQL, AI providers, collector operations, and object storage.', sources: sourceGroups.readme },
    { type: 'content', variant: 'table', title: 'Expansion map', subtitle: 'The next integrations attach to existing boundaries', table: { headers: ['Future integration', 'Attach point', 'Risk control'], rows: [['Supabase/PostgreSQL', 'Prisma models and storage layer', 'Migration and approval-gated writes'], ['AI providers', 'AI router candidate list', 'Fallback metadata and provider health'], ['RPA/collector ops', 'JSON artifact and import scripts', 'No raw crawler data in public DTO'], ['Cloudflare R2', 'storage boundary', 'Local fallback remains available']] }, sources: sourceGroups.readme },
    { type: 'closing', title: 'Neet2Work as a system blueprint', subtitle: 'A career preparation product whose architecture keeps the demo stable and real integrations replaceable.', bullets: ['Product surface: jobs, AI analysis, documents, auth', 'Architecture: REST boundary, services, storage, provider router', 'Evidence: generated diagrams, ERDs, screenshots, QA artifacts', 'Next step: attach real services without rewriting the user path'], footer: 'Neet2Work / Tech Blueprint rebuild / 2026-06-09' },
  ];
}

async function main() {
  if (fs.existsSync(workspace)) throw new Error(`Target already exists: ${workspace}`);
  ensureDir(conceptDir);
  ensureDir(screenshotsDir);
  ensureDir(diagramsDir);
  ensureDir(buildDir);
  copyDir(path.join(previous, 'assets', 'screenshots'), screenshotsDir);
  copyDir(path.join(previous, 'assets', 'diagrams-png'), diagramsDir);

  await writePng('cover-blueprint.png', blueprintSvg('journey', 'Career Platform System Blueprint', 'job signals, documents, and AI workflow connected through stable boundaries', [[230, 410, 'User journey', '#22d3ee'], [610, 320, 'Job signal', '#38bdf8'], [980, 440, 'Evidence store', '#f59e0b'], [1360, 340, 'AI workflow', '#a78bfa']]));
  await writePng('architecture-map.png', blueprintSvg('architecture', 'Runtime Boundary Map', 'frontend, REST API, storage, database, and provider fallback as a readable operating map', [[210, 360, 'Frontend', '#22d3ee'], [565, 485, 'REST API', '#38bdf8'], [920, 360, 'Services', '#f59e0b'], [1270, 485, 'Storage', '#34d399'], [1490, 280, 'AI Router', '#a78bfa']]));
  await writePng('implementation-console.png', blueprintSvg('implementation', 'Implementation Console', 'local demo path, deterministic fallback, and verification signals for the final presentation', [[230, 430, 'Local demo', '#22d3ee'], [610, 310, 'Fallback', '#f59e0b'], [980, 470, 'Tests', '#34d399'], [1360, 330, 'Build QA', '#a78bfa']]));

  const slides = slideSet();
  writeJson('design_brief.json', {
    topic: 'Neet2Work Tech Blueprint presentation',
    content_maturity: 'technical/educational',
    audience_posture: 'developers/operators',
    emotional_register: 'trustworthy and precise',
    format_promise: 'A system-blueprint presentation that explains boundaries, data flow, fallback design, and implementation evidence. It must not feel like the previous executive-clinical product report.',
    anti_format: ['reused previous outline', 'repeated cards-3 grids', 'generic navy header deck', 'SVG insertion into PPTX'],
    design_dna: 'custom tech blueprint',
    title_page_concept: {
      chosen_archetype: 'operating map cover',
      dominant_element: 'generated blueprint visual connecting user journey, jobs, evidence, and AI workflow',
      why_this_could_only_be_this_deck: 'Neet2Work is presented as a career-preparation system with mock-first runtime boundaries.',
    },
    structure_strategy: {
      primary_scaffold: 'section-led technical narrative',
      repeated_elements: ['dark grid backgrounds on section changes', 'numbered boundary callouts', 'diagram-first evidence slides'],
      allowed_variations: ['image-sidebar', 'scientific-figure', 'table', 'timeline', 'matrix', 'flow', 'kpi-hero'],
      container_policy: 'Use cards only for boundary groups; prefer diagrams, tables, and two-column evidence slides.',
      rhythm_break_plan: 'Use three Creative Production concept PNGs for cover, architecture transition, and implementation transition.',
    },
    renderer_treatments: {
      header_mode: 'eyebrow',
      title_layout: 'command-center',
      title_motif: 'network',
      section_motif: 'rail-dots',
      timeline_mode: 'bands',
      matrix_mode: 'open-quadrants',
      stats_mode: 'policy-bands',
      footer_mode: 'source-line',
    },
    plugins_used: ['Product Design:get-context for brief locking', 'Creative Production:style route and concept asset direction', 'presentation-skill for PPTX build'],
  });

  writeJson('content_plan.json', {
    topic: 'Neet2Work Tech Blueprint presentation',
    audience: 'developer presentation audience',
    objective: 'Reframe Neet2Work as a technical system blueprint with clear runtime, data, AI, and demo-stability boundaries.',
    thesis: 'Neet2Work is valuable because the product surface and implementation boundaries preserve a stable career-preparation demo while keeping real DB, AI, and collection integrations attachable.',
    narrative_arc: [
      { act: 'why-system-exists', purpose: 'Move quickly from product problem to mock-first architecture.', slides: ['s01-s08'] },
      { act: 'product-surface-as-boundary', purpose: 'Show screens as API and data boundaries, not just UI features.', slides: ['s09-s16'] },
      { act: 'architecture-blueprint', purpose: 'Explain runtime, workflow, dependency, ERD, and service boundaries.', slides: ['s17-s30'] },
      { act: 'implementation-evidence', purpose: 'Close with code structure, fallback, verification, and extension path.', slides: ['s31-s40'] },
    ],
  });

  writeJson('evidence_plan.json', {
    topic: 'Neet2Work Tech Blueprint presentation',
    source_policy: 'Use repository docs and generated PNG assets as source-backed evidence. Do not invent runtime claims.',
    items: [
      { id: 'repo-readme', claim: 'Neet2Work combines job posting search, document management, and AI self-introduction workflow.', source_title: 'README.md', visual_use: 'source footer' },
      { id: 'mock-first', claim: 'External DB, AI, and storage are optional for demo stability.', source_title: 'README.md / docs/ARCHITECTURE.md', visual_use: 'boundary callout' },
      { id: 'frontend-boundary', claim: 'Frontend calls backend REST API instead of direct database/provider access.', source_title: 'README.md / docs/ARCHITECTURE.md', visual_use: 'architecture slide' },
      { id: 'ai-routing', claim: 'AI workflow routes through Codex Bridge, Gemini, local AI, and fallback demo.', source_title: 'README.md', visual_use: 'sequence slide' },
      { id: 'documents-data', claim: 'Documents, profiles, and sets are managed as career preparation lifecycle data.', source_title: 'README.md', visual_use: 'ERD slide' },
    ],
    open_questions: [],
  });

  writeJson('asset_plan.json', {
    topic: 'Neet2Work Tech Blueprint presentation',
    images: [],
    backgrounds: [],
    charts: [],
    local_assets: [
      'assets/concept/cover-blueprint.png',
      'assets/concept/architecture-map.png',
      'assets/concept/implementation-console.png',
      'assets/screenshots/home.png',
      'assets/screenshots/jobs.png',
      'assets/screenshots/ai-analysis.png',
      'assets/screenshots/documents.png',
      'assets/screenshots/login.png',
      'assets/diagrams-png/system-overview.png',
      'assets/diagrams-png/architecture-runtime.png',
      'assets/diagrams-png/ai-draft-workflow-sequence.png',
      'assets/diagrams-png/sequence-document-create.png',
      'assets/diagrams-png/dependency-overview.png',
      'assets/diagrams-png/documents-profile.png',
      'assets/diagrams-png/erd-documents.png',
      'assets/diagrams-png/erd-jobs.png',
      'assets/diagrams-png/class-services.png',
    ],
    provenance: 'Concept PNGs are locally generated Tech Blueprint visual assets. Screenshots and diagram PNGs are reused from prior local Neet2Work presentation assets. SVG files are not inserted into PPTX.',
  });

  writeJson('outline.json', {
    title: 'Neet2Work Tech Blueprint',
    subtitle: 'Mock-first career platform architecture for developer audiences',
    deck_style: {
      visual_density: 'medium',
      emoji_mode: 'none',
      font_pair: 'clean_modern_v1',
      header_mode: 'eyebrow',
      footer_page_numbers: false,
      title_layout: 'command-center',
      title_motif: 'network',
      section_motif: 'rail-dots',
      timeline_mode: 'bands',
      matrix_mode: 'open-quadrants',
      stats_mode: 'policy-bands',
    },
    slides,
  });

  writeJson('workspace.json', {
    workspace_version: 1,
    deck_title: 'Neet2Work Tech Blueprint',
    deck_slug: `neet2work__tech-blueprint-pd-cp__${timestamp}`,
    style_contract: 'style_contract.json',
    content_plan: 'content_plan.json',
    design_brief: 'design_brief.json',
    evidence_plan: 'evidence_plan.json',
    outline: 'outline.json',
    asset_plan: 'asset_plan.json',
    notes: 'notes.md',
    assets_dir: 'assets',
    staged_assets_dir: 'assets/staged',
    build_dir: 'build',
    reference_pptx: null,
  });

  writeJson('style_contract.json', {
    workspace_version: 1,
    deck_title: 'Neet2Work Tech Blueprint',
    deck_slug: `neet2work__tech-blueprint-pd-cp__${timestamp}`,
    build: {
      style_preset: 'midnight-neon',
      font_pair: null,
      palette_key: null,
      output_pptx: 'build/neet2work.pptx',
      qa_dir: 'build/qa',
      qa_report: 'build/qa/report.json',
    },
    layout_rules: {
      alignment_first: true,
      zero_overlap_required: true,
      title_subtitle_stack_dynamic: true,
      footer_safe_region_required: true,
    },
    concept_route: {
      product_design: 'career platform system blueprint',
      creative_production: ['system-blueprint', 'operating-console', 'technical-map', 'numbered-callouts', 'cyan-amber-accents'],
    },
  });

  fs.writeFileSync(path.join(workspace, 'notes.md'), `# Neet2Work Tech Blueprint Notes\n\n- Built as a new concept, not a clone of the prior presentation.\n- Product Design route: career platform system blueprint for developer audience.\n- Creative Production route: system blueprint, operating console, technical map, numbered callouts, cyan/amber accents.\n- Existing assets reused only as PNG screenshots and diagram PNGs.\n- SVG files remain source references only and are not inserted as PowerPoint images.\n`, 'utf8');
  fs.writeFileSync(path.join(workspace, 'README.md'), '# Neet2Work Tech Blueprint Deck\n\nFresh presentation workspace for a developer-facing Tech Blueprint version of the Neet2Work project presentation.\n\nFinal output: `build/neet2work.pptx`.\n', 'utf8');
  fs.writeFileSync(path.join(assets, 'attribution.csv'), 'name,path,source,license\ncover-blueprint,assets/concept/cover-blueprint.png,local generated concept asset,project artifact\narchitecture-map,assets/concept/architecture-map.png,local generated concept asset,project artifact\nimplementation-console,assets/concept/implementation-console.png,local generated concept asset,project artifact\n', 'utf8');

  console.log(JSON.stringify({ workspace, slides: slides.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
