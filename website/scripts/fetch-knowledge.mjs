// The BB Report Tool's knowledge (what it knows about problems and their fixes), signed by BB Helper on the forum
// server, mirrored to bbport.de/tool/ so the tool can fetch it from GitHub Pages. Runs in .github/workflows/website.yml:
//
//   node scripts/fetch-knowledge.mjs          writes public/tool/knowledge.json(.sig) if the forum's copy is valid
//                                             and newer (on errors the files from the repo stay)
//   node scripts/fetch-knowledge.mjs --check  knowledge=true in $GITHUB_OUTPUT when the forum has a newer valid
//                                             copy than bbport.de, so the schedule rebuilds
//
// knowledge.json is an envelope {format, serial, published, revoked, knowledge}; knowledge.json.sig is the base64
// RSA PKCS#1 v1.5 SHA-256 signature over its exact bytes. Only a copy that verifies with knowledge-key.pub.pem goes
// live: the website never changes the bytes, the tool checks the same signature. For testing:
// KNOWLEDGE_SOURCE (instead of https://forum.bbport.de/tool) and KNOWLEDGE_LIVE (instead of the website).
import { createVerify } from 'node:crypto';
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SITE } from '../site.config.mjs';

const source = (process.env.KNOWLEDGE_SOURCE || 'https://forum.bbport.de/tool').replace(/\/$/, '');
const live = (process.env.KNOWLEDGE_LIVE || `${SITE.url}${SITE.base}tool`).replace(/\/$/, '');
const dir = new URL('../public/tool/', import.meta.url);
const publicKey = await readFile(new URL('./knowledge-key.pub.pem', import.meta.url), 'utf8');

async function get(url) {
  if (!/^https?:/.test(url)) return readFile(url.replace(/^file:\/\//, ''));
  const response = await fetch(url, { headers: { 'User-Agent': 'bbport-website' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// The envelope if signature and format are right, else an error
async function verified(base) {
  const [data, sig] = await Promise.all([get(`${base}/knowledge.json`), get(`${base}/knowledge.json.sig`)]);
  const ok = createVerify('sha256').update(data).verify(publicKey, Buffer.from(sig.toString('ascii').trim(), 'base64'));
  if (!ok) throw new Error(`${base}: signature does not match`);
  const envelope = JSON.parse(data.toString('utf8'));
  if (envelope.format !== 1 || !Number.isInteger(envelope.serial) || !envelope.knowledge?.version) {
    throw new Error(`${base}: not a knowledge envelope`);
  }
  return { data, sig, envelope };
}

async function serialAt(base) {
  try { return (await verified(base)).envelope.serial; } catch { return 0; }
}

const fresh = await verified(source).catch((error) => { console.warn(`Knowledge: ${error.message}`); return null; });
if (process.argv.includes('--check')) {
  const changed = Boolean(fresh) && fresh.envelope.serial > await serialAt(live);
  console.log(`Knowledge: forum ${fresh ? `v${fresh.envelope.knowledge.version} serial ${fresh.envelope.serial}` : '–'}, newer than the website: ${changed}`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `knowledge=${changed}\n`);
} else if (fresh) {
  const current = await serialAt(fileURLToPath(dir).replace(/[\\/]$/, ''));
  if (fresh.envelope.serial >= current) {
    await mkdir(dir, { recursive: true });
    await writeFile(new URL('knowledge.json', dir), fresh.data);
    await writeFile(new URL('knowledge.json.sig', dir), fresh.sig);
    console.log(`Knowledge: v${fresh.envelope.knowledge.version} (serial ${fresh.envelope.serial}) written to public/tool/`);
  } else {
    console.log(`Knowledge: the repo's copy (serial ${current}) is newer than the forum's, kept`);
  }
}
