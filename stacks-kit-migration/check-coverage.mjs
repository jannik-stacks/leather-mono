#!/usr/bin/env node
// Behavior inventory check for the stacks.js to Stacks Kit migration.
// Run in a repo checkout: node check-coverage.mjs [--inventory path] [--json] [--draft] [--all]
// Exit 0 when every discovered site is in the inventory and every entry has a live proof.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const inventoryPath = option('--inventory', 'stacks-kit-migration/inventory.json');
const limit = flag('--all') ? Infinity : Number(option('--limit', 60));

const DEFAULT_SCOPE = {
  packages: ['@stacks/*', 'c32check', 'micro-stacks', '@jannik-stacks/kit'],
  retained: [
    '@stacks/stacks-blockchain-api-types',
    '@stacks/blockchain-api-client',
    '@stacks/token-metadata-api-client',
    '@stacks/eslint-config',
    '@stacks/prettier-config',
  ],
  wrappers: [],
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/*.d.ts', 'stacks-kit-migration/**'],
  tests: ['**/*.spec.*', '**/*.test.*', '**/__tests__/**', '**/__mocks__/**', '**/mocks/**', '**/*.mock.*', '**/test-utils/**', 'tests/**', 'e2e/**', '**/vectors/**', '**/fixtures/**'],
  includeTypeOnly: false,
};

// Ordered: a call line is tagged with every kind whose pattern matches it or, failing that, the file.
const SINKS = {
  storage: /localStorage|sessionStorage|indexedDB|idb-keyval|chrome\.storage|browser\.storage|redux-persist|persistReducer|persistQueryClient|Persister|AsyncStorage|SecureStore|MMKV|Keychain|keychain|setItem\(|getItem\(|encryptMnemonic|decryptMnemonic|encryptContent|decryptContent|persistedStore|storage\.(set|get)/,
  url: /router\.(push|replace)|useRouter|useParams|useSearchParams|searchParams|URLSearchParams|buildUrl|href=|new URL\(|navigate\(|Linking\.|deeplink|deepLink|window\.location/,
  'query-key': /queryKey|useQuery|useQueries|useInfiniteQuery|useSuspenseQuery|QueryKey|createQueryKey/,
  wire: /serialize|deserialize|sign[A-Z(]|Signer|makeContract|makeSTX|makeUnsigned|makeSigned|broadcast|bytesToHex|hexToBytes|txid|structuredData|StructuredData|hashMessage|encodeMessage|publicKeyTo|privateKeyTo|getAddressFromPrivateKey|getAddressFromPublicKey|c32address|c32ToB58|b58ToC32|generateWallet|generateSecretKey|deriveStxPrivateKey/,
  api: /fetch\(|axios|\.post\(|\.get\(|postMessage|sendMessage|sendResponse|callReadOnly|fetchCallReadOnly|request\(|openContractCall|openSTXTransfer|showConnect|connect\(|analytics|track\(|makeRpc|RpcResponse|rpc/i,
  state: /createSlice|createAction|useAtom|atom\(|atomWithStorage|zustand|reducer|useSelector|dispatch\(|useState|useForm|Formik/,
  display: /cvToString|cvToValue|cvToJSON|prettyPrint|format[A-Z]|toLocaleString|<Text|<Caption|<Title|<span|<Box|<styled|\{[^}]*\}\s*<\/|t`|i18n/,
};

const globToRegex = glob =>
  new RegExp(
    '^' +
      glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*\//g, '\u0000')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\u0000/g, '(?:.*/)?') +
      '$'
  );
const matchesAny = (value, globs) => globs.some(g => globToRegex(g).test(value));

function readInventory() {
  const path = join(root, inventoryPath);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listFiles(scope) {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  return out
    .split('\0')
    .filter(
      f =>
        /\.(m|c)?[jt]sx?$/.test(f) &&
        !matchesAny(f, scope.ignore) &&
        !matchesAny(f, scope.tests) &&
        existsSync(join(root, f))
    );
}

const IMPORT =
  /(?:import\s+(type\s+)?([\s\S]*?)\s+from\s+|export\s+(type\s+)?([\s\S]*?)\s+from\s+|import\(\s*|require\(\s*|(?:jest|vi)\.mock\(\s*)['"]([^'"]+)['"]/g;

function parseNames(clause) {
  if (!clause) return ['*'];
  const names = [];
  const braces = clause.match(/\{([\s\S]*)\}/);
  if (braces)
    for (const part of braces[1].split(',')) {
      const m = part.trim().match(/^(?:type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (m) names.push({ symbol: m[1], local: m[2] ?? m[1] });
    }
  const rest = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, ' ').trim();
  const ns = rest.match(/\*\s+as\s+([\w$]+)/);
  if (ns) names.push({ symbol: '*', local: ns[1] });
  else if (/^[\w$]+$/.test(rest)) names.push({ symbol: 'default', local: rest });
  return names.length ? names : ['*'];
}

// Deep imports such as '@stacks/transactions/dist/cl' count as their package.
function trackedPackage(spec, scope) {
  const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
  if (matchesAny(name, scope.retained)) return null;
  if (matchesAny(name, scope.packages) || matchesAny(name, scope.wrappers)) return spec;
  return null;
}

function discover(scope) {
  const sites = [];
  for (const file of listFiles(scope)) {
    const text = readFileSync(join(root, file), 'utf8');
    if (!/@stacks\/|c32check|micro-stacks|@jannik-stacks\/kit|@leather\.io\//.test(text)) continue;
    const lines = text.split('\n');
    const lineOf = index => text.slice(0, index).split('\n').length;
    const imports = [];
    for (const m of text.matchAll(IMPORT)) {
      const pkg = trackedPackage(m[5], scope);
      if (!pkg) continue;
      const clause = m[2] ?? m[4];
      const typeOnly = Boolean(m[1] || m[3]);
      const names = m[0].startsWith('import') && clause ? parseNames(clause) : [{ symbol: '*', local: null }];
      for (const n of names) imports.push({ pkg, ...n, typeOnly, line: lineOf(m.index) });
    }
    if (!imports.length) continue;
    const fileSinks = Object.keys(SINKS).filter(k => SINKS[k].test(text));
    if (/\.tsx$/.test(file) && !fileSinks.includes('display')) fileSinks.push('display');
    for (const imp of imports) {
      const calls = [];
      if (imp.local) {
        const use = new RegExp(`(?<![\\w$.])${imp.local.replace(/\$/g, '\\$')}(?![\\w$])`);
        lines.forEach((l, i) => {
          if (i + 1 !== imp.line && use.test(l) && !/^\s*(import|export .* from|\*|\/\/)/.test(l)) calls.push(i + 1);
        });
      }
      const near = calls.flatMap(n => lines.slice(Math.max(0, n - 3), n + 2)).join('\n');
      const lineSinks = Object.keys(SINKS).filter(k => SINKS[k].test(near));
      const sinks = lineSinks.length ? lineSinks : fileSinks.length ? fileSinks : ['unclassified'];
      sites.push({
        file,
        symbol: imp.symbol,
        package: imp.pkg,
        line: imp.line,
        calls,
        typeOnly: imp.typeOnly,
        sinks,
        fileSinks,
      });
    }
  }
  return sites;
}

const siteKey = s => `${s.file}#${s.symbol}`;

function entryKeys(entry) {
  return (entry.sites ?? [{ file: entry.file, symbol: entry.symbol }]).flatMap(s =>
    (Array.isArray(s.symbol) ? s.symbol : [s.symbol]).map(symbol => `${s.file}#${symbol}`)
  );
}

function checkProof(entry) {
  const problems = [];
  const proofs = [entry.proof ?? []].flat();
  const noSink = [entry.sink ?? entry.sinks ?? []].flat().every(k => k === 'none');
  if (!proofs.length && noSink && entry.reason) return [];
  if (!proofs.length) return [`${entry.id}: no proof${noSink ? ' and no reason for sink none' : ''}`];
  for (const p of proofs) {
    if (!p.test && !p.vector) problems.push(`${entry.id}: proof needs a test or a vector`);
    for (const [kind, ref] of [
      ['test', p.test],
      ['vector', p.vector],
    ]) {
      if (!ref) continue;
      const path = join(root, ref.file ?? '');
      if (!ref.file || !existsSync(path)) {
        problems.push(`${entry.id}: ${kind} file ${ref.file ?? '(none)'} is missing`);
        continue;
      }
      const needle = kind === 'test' ? ref.name : ref.id;
      if (!needle) problems.push(`${entry.id}: ${kind} in ${ref.file} needs a ${kind === 'test' ? 'name' : 'id'}`);
      else if (!readFileSync(path, 'utf8').includes(needle))
        problems.push(`${entry.id}: ${kind} "${needle}" not found in ${ref.file}`);
    }
  }
  return problems;
}

function baseInventory() {
  const base = process.env.AGENTGRAPH_BASE;
  if (!base) return null;
  try {
    return JSON.parse(
      execFileSync('git', ['show', `${base}:${inventoryPath}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    );
  } catch {
    return null;
  }
}

function draft(sinkSites, inventory) {
  const byFile = new Map();
  for (const s of sinkSites) byFile.set(s.file, [...(byFile.get(s.file) ?? []), s]);
  const entries = [...byFile].map(([file, list], i) => {
    const symbols = [...new Set(list.map(s => s.symbol))];
    return {
      id: `S${String(i + 1).padStart(3, '0')}`,
      file,
      line: Math.min(...list.flatMap(s => (s.calls.length ? s.calls : [s.line]))),
      symbol: symbols,
      sinks: [...new Set(list.flatMap(s => s.sinks))],
      sites: [{ file, symbol: symbols }],
    };
  });
  return { scope: inventory?.scope, entries };
}

// In a graph run, only issues that carry the inventory requirement are checked.
function applies() {
  const context = process.env.AGENTGRAPH_CONTEXT;
  if (flag('--force') || !context || !existsSync(context)) return true;
  return /^#+\s*Behavior inventory/im.test(readFileSync(context, 'utf8'));
}

function main() {
  if (!applies()) return void console.log('n/a: the issue has no "Behavior inventory" section.');
  const inventory = readInventory();
  const scope = { ...DEFAULT_SCOPE, ...(inventory?.scope ?? {}) };
  const sites = discover(scope);
  // A type-only import counts where the file persists or holds state: the type then shapes stored data.
  const tracked = sites.filter(
    s => !s.typeOnly || scope.includeTypeOnly || s.fileSinks.some(k => k === 'storage' || k === 'state')
  );
  if (flag('--draft')) return void console.log(JSON.stringify(draft(tracked, inventory), null, 2));

  const problems = [];
  if (!inventory) problems.push(`No inventory at ${inventoryPath}. Commit one that lists every site below.`);
  const covered = new Set((inventory?.entries ?? []).flatMap(entryKeys));
  const missing = tracked.filter(s => !covered.has(siteKey(s)));
  const proofProblems = (inventory?.entries ?? []).flatMap(checkProof);

  const dropped = [];
  const before = baseInventory();
  if (before && inventory) {
    const now = new Set(inventory.entries.map(e => e.id));
    const reasons = new Map((inventory.dropped ?? []).map(d => [d.id, d.reason]));
    for (const e of before.entries ?? [])
      if (!now.has(e.id) && !reasons.get(e.id))
        dropped.push(`${e.id} (${e.file ?? e.sites?.[0]?.file}) was removed without a reason under "dropped"`);
  }

  const pass = !problems.length && !missing.length && !proofProblems.length && !dropped.length;
  process.exitCode = pass ? 0 : 1;
  const counts = {};
  for (const s of tracked) for (const k of s.sinks) counts[k] = (counts[k] ?? 0) + 1;
  if (flag('--json'))
    return void console.log(
      JSON.stringify({ pass, importSites: sites.length, tracked: tracked.length, counts, missing, proofProblems, dropped, problems }, null, 2)
    );

  const show = (title, list) => {
    if (!list.length) return;
    console.log(`\n${title} (${list.length}):`);
    for (const line of list.slice(0, limit)) console.log(`  ${line}`);
    if (list.length > limit) console.log(`  ... and ${list.length - limit} more (run with --all)`);
  };
  console.log(
    `${pass ? 'PASS' : 'FAIL'}: ${sites.length} import sites, ${tracked.length} tracked, ${missing.length} not in the inventory, ${proofProblems.length} proof problems, ${dropped.length} removed entries.`
  );
  console.log(`Sinks: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  problems.forEach(p => console.log(p));
  show(
    'Sites missing from the inventory',
    missing.map(s => `${s.file}:${s.calls[0] ?? s.line} ${s.symbol} from ${s.package} -> ${s.sinks.join(', ')}`)
  );
  show('Proof problems', proofProblems);
  show('Removed entries', dropped);
}

main();

