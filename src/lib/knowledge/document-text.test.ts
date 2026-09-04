import { describe, it, expect } from 'vitest';
import { extractDocumentText } from './document-text';

describe('attachment text extraction (what the specialist will read)', () => {
  it('extracts plain-text uploads verbatim enough to answer from', async () => {
    const body = [
      'FOOD DIARY - WEEK OF 12 MAY',
      'Breakfast: porridge with banana, black coffee.',
      'NOTE: I am allergic to WALNUTS and I do not eat pork.',
    ].join('\n');
    const file = new File([body], 'food-diary.txt', { type: 'text/plain' });
    const text = await extractDocumentText(file);
    expect(text).toContain('WALNUTS');
    expect(text).toContain('porridge');
  });

  it('rejects an unsupported type instead of silently returning nothing', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'scan.png', { type: 'image/png' });
    await expect(extractDocumentText(file)).rejects.toThrow();
  });
});
