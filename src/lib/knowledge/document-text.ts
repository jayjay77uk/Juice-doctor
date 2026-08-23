import 'server-only';

import { inflateRawSync, inflateSync } from 'node:zlib';

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function findEocd(buf: Buffer): number {
  const min = Math.max(0, buf.length - 65_557);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

/** Extract word/document.xml directly from a DOCX ZIP without adding a parser dependency. */
function extractDocx(buf: Buffer): string {
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error('The DOCX archive is not valid.');
  const entries = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < entries && offset + 46 <= buf.length; i += 1) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    if (name === 'word/document.xml') {
      if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('The DOCX document entry is invalid.');
      const localNameLength = buf.readUInt16LE(localOffset + 26);
      const localExtraLength = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buf.subarray(start, start + compressedSize);
      const xml = (method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null)?.toString('utf8');
      if (!xml) throw new Error('This DOCX compression method is not supported.');
      const text = xml
        .replace(/<w:tab\b[^>]*\/>/g, '\t')
        .replace(/<w:br\b[^>]*\/>/g, '\n')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g, '$1')
        .replace(/<[^>]+>/g, '');
      return cleanText(decodeXml(text));
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error('The DOCX file does not contain a Word document body.');
}

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\([\\()])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([0-7]{1,3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)));
}

function pdfLiterals(value: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== '(') continue;
    let depth = 1;
    let escaped = false;
    let current = '';
    for (let j = i + 1; j < value.length; j += 1) {
      const ch = value[j];
      if (escaped) {
        current += `\\${ch}`;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      if (depth === 0) {
        if (current.trim().length > 1) out.push(decodePdfLiteral(current));
        i = j;
        break;
      }
      current += ch;
    }
  }
  return out;
}

/**
 * Extract common text-based PDF streams. This intentionally does not OCR image-
 * only PDFs. It handles uncompressed and FlateDecode content streams and fails
 * honestly when a PDF needs OCR/custom font decoding instead of inventing text.
 */
function extractPdf(buf: Buffer): string {
  if (!buf.subarray(0, 5).toString('ascii').startsWith('%PDF-')) throw new Error('The PDF signature is invalid.');
  const latin = buf.toString('latin1');
  const chunks: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin))) {
    const raw = Buffer.from(match[1] ?? '', 'latin1');
    const dictStart = Math.max(0, match.index - 700);
    const dictionary = latin.slice(dictStart, match.index);
    let decoded = raw;
    if (/\/FlateDecode\b/.test(dictionary)) {
      try {
        decoded = inflateSync(raw);
      } catch {
        try {
          decoded = inflateRawSync(raw);
        } catch {
          continue;
        }
      }
    }
    const body = decoded.toString('latin1');
    if (!/\b(Tj|TJ|'|")\b/.test(body) && !body.includes('BT')) continue;
    chunks.push(...pdfLiterals(body));
  }
  const text = cleanText(chunks.join(' '));
  if (text.length < 20) {
    throw new Error('No extractable text was found in this PDF. Image-only/scanned PDFs need OCR; paste the approved text instead.');
  }
  return text;
}

export async function extractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (name.endsWith('.txt') || name.endsWith('.csv')) {
    const text = cleanText(buf.toString('utf8'));
    if (!text) throw new Error('The uploaded file contains no readable text.');
    return text;
  }
  if (name.endsWith('.docx')) return extractDocx(buf);
  if (name.endsWith('.pdf')) return extractPdf(buf);
  throw new Error('Only PDF, DOCX, TXT and CSV knowledge files are supported.');
}
