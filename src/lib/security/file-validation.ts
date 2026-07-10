import { AppError } from './errors';

/**
 * File-upload validation. Uploads (knowledge documents, avatars, CV attachments)
 * are validated on BOTH the size and the true content type — never trusting the
 * client-supplied filename or MIME alone. Magic-number sniffing catches renamed
 * files. A `future: malware scan` hook marks where ClamAV / a scanning service
 * plugs in before a file is accepted.
 */

export interface FileConstraint {
  maxBytes: number;
  /** Allowed extensions (lowercase, no dot). */
  extensions: string[];
  /** Allowed MIME types. */
  mimeTypes: string[];
}

/** Magic-number signatures for the formats we accept, for content sniffing. */
const SIGNATURES: { ext: string; bytes: number[]; offset?: number }[] = [
  { ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: 'docx', bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK.. (zip container)
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
];

export const UPLOAD_CONSTRAINTS = {
  knowledgeDocument: {
    maxBytes: 25 * 1024 * 1024,
    extensions: ['pdf', 'docx', 'txt', 'csv'],
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ],
  },
  avatar: {
    maxBytes: 4 * 1024 * 1024,
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
} as const satisfies Record<string, FileConstraint>;

export interface UploadCandidate {
  filename: string;
  mimeType: string;
  size: number;
  /** First bytes of the file, for magic-number sniffing. */
  head?: Uint8Array;
}

function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? (parts.at(-1) ?? '') : '';
}

function matchesSignature(head: Uint8Array, ext: string): boolean {
  const sigs = SIGNATURES.filter((s) => s.ext === ext || (ext === 'jpeg' && s.ext === 'jpg'));
  if (sigs.length === 0) return true; // txt/csv have no reliable magic number
  return sigs.some((sig) => {
    const offset = sig.offset ?? 0;
    return sig.bytes.every((b, i) => head[offset + i] === b);
  });
}

/**
 * Validate an upload against a constraint. Throws a typed AppError on failure.
 * Text formats (txt/csv) skip signature checks; binary formats are sniffed.
 */
export function validateUpload(file: UploadCandidate, constraint: FileConstraint): void {
  if (file.size > constraint.maxBytes) {
    throw new AppError('payload_too_large', 'That file is too large.', {
      details: { maxBytes: constraint.maxBytes, size: file.size },
    });
  }
  const ext = extensionOf(file.filename);
  if (!constraint.extensions.includes(ext)) {
    throw new AppError('unsupported_media', 'That file type is not allowed.', {
      details: { allowed: constraint.extensions },
    });
  }
  if (!constraint.mimeTypes.includes(file.mimeType)) {
    throw new AppError('unsupported_media', 'That file type is not allowed.');
  }
  if (file.head && !matchesSignature(file.head, ext)) {
    throw new AppError('unsupported_media', 'That file’s contents do not match its type.');
  }
  // future: enqueue for malware scanning (ClamAV / cloud scanner) before accept.
}
