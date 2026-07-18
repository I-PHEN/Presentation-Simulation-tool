const MAX_DECK_SIZE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_DECK_EXTENSION = /\.(pptx|ppt|pdf)$/i;

export type DeckUploadValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateDeckUpload(
  file: Pick<File, 'name' | 'size'>,
): DeckUploadValidation {
  if (!SUPPORTED_DECK_EXTENSION.test(file.name)) {
    return {
      ok: false,
      error: 'Upload a PowerPoint or PDF deck.',
    };
  }

  if (file.size > MAX_DECK_SIZE_BYTES) {
    return {
      ok: false,
      error: 'Decks must be 25 MB or smaller.',
    };
  }

  return { ok: true };
}
