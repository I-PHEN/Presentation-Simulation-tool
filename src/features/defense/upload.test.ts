import { describe, expect, it } from 'vitest';
import { validateDeckUpload } from './upload';

describe('validateDeckUpload', () => {
  it.each(['thesis.pptx', 'thesis.ppt', 'thesis.pdf'])('accepts %s', (name) => {
    expect(validateDeckUpload({ name, size: 1024 })).toEqual({ ok: true });
  });

  it('accepts PowerPoint files case-insensitively within the size limit', () => {
    expect(validateDeckUpload({ name: 'defense.PPTX', size: 2_000_000 })).toEqual({ ok: true });
  });

  it('rejects unsupported document types', () => {
    expect(validateDeckUpload({ name: 'notes.docx', size: 2_000_000 })).toMatchObject({ ok: false });
  });

  it('rejects files larger than 25 MB', () => {
    expect(validateDeckUpload({ name: 'large.pdf', size: 26 * 1024 * 1024 })).toMatchObject({ ok: false });
  });
});
