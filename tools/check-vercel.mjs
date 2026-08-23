/**
 * Validate vercel.json against Vercel's published schema, before a push rather than during a deploy.
 *
 *   node tools/check-vercel.mjs
 *
 * This exists because a deploy failed on `rewrites[0] should NOT have additional property "//"`. The
 * config had a `"//"` key used as a comment - JSON has none - and the local check at the time only
 * parsed the file, so valid-JSON-but-invalid-schema sailed through and only surfaced on Vercel.
 *
 * It implements the subset of JSON Schema that vercel.json actually uses: type, properties,
 * additionalProperties, required, items, enum, and anyOf/oneOf. Not a general validator, and it says
 * so rather than pretending otherwise.
 *
 * The schema is fetched, so this is deliberately NOT part of `npm run build`: a deploy must not
 * depend on a network call to a third party. Offline, it reports that it could not check and exits 0.
 */
import { readFile } from 'node:fs/promises';

const SCHEMA = 'https://openapi.vercel.sh/vercel.json';
const FILE = 'vercel.json';

const problems = [];
const at = (path) => (path.length ? path.join('') : '(root)');

function validate(value, schema, path = []) {
  if (!schema || typeof schema !== 'object') return;

  /* Union branches: valid if any one of them accepts the value. */
  for (const key of ['anyOf', 'oneOf']) {
    if (Array.isArray(schema[key])) {
      const ok = schema[key].some((s) => {
        const before = problems.length;
        validate(value, s, path);
        const passed = problems.length === before;
        problems.length = before;
        return passed;
      });
      if (!ok) problems.push(`${at(path)} does not match any allowed shape`);
      return;
    }
  }

  const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (schema.type && schema.type !== kind && !(schema.type === 'integer' && kind === 'number')) {
    problems.push(`${at(path)} should be ${schema.type}, got ${kind}`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    problems.push(`${at(path)} should be one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}`);
  }

  if (kind === 'object') {
    for (const req of schema.required ?? []) {
      if (!(req in value)) problems.push(`${at(path)} is missing required property "${req}"`);
    }
    for (const [k, v] of Object.entries(value)) {
      const sub = schema.properties?.[k];
      if (sub) {
        validate(v, sub, [...path, `.${k}`]);
      } else if (schema.additionalProperties === false) {
        problems.push(`${at(path)} should NOT have additional property "${k}"`);
      }
    }
  }

  if (kind === 'array' && schema.items) {
    value.forEach((v, i) => validate(v, schema.items, [...path, `[${i}]`]));
  }
}

const config = JSON.parse(await readFile(FILE, 'utf8'));

let schema;
try {
  const res = await fetch(SCHEMA, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  schema = await res.json();
} catch (e) {
  console.log(`check-vercel: could not fetch the schema (${String(e.message ?? e)}).`);
  console.log('check-vercel: JSON parses, but the schema was NOT checked.');
  process.exit(0);
}

/* `$schema` is ours, not Vercel's, and the schema does not describe itself. */
const { $schema, ...rest } = config;
validate(rest, schema);

if (problems.length) {
  console.error(`check-vercel: ${FILE} is invalid`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`check-vercel: ${FILE} valid against ${SCHEMA}`);
