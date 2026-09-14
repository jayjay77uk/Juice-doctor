import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [/\bsk-ant-api\d*-[-_A-Za-z0-9]{20,}/, /\bsbp_[a-zA-Z0-9]{25,}/, /\bgh[pousr]_[a-zA-Z0-9]{25,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\|[^\n]*admin@[^\n]*\|\s*`[^`]+`\s*\|/i];
const failed = files.filter(f => !/\.(png|jpg|jpeg|ico|woff2?|pdf)$/.test(f)).filter(f => {
  if (f === 'scripts/check-secrets.mjs') return false;
  return patterns.some(p => p.test(readFileSync(f, 'utf8')));
});
if (failed.length) { console.error('Potential credentials found in:', failed.join(', ')); process.exit(1); }
console.log('Tracked files contain no recognised credential patterns.');
