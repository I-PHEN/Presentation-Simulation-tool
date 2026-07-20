import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DeckContinuationAction, DeckContinuationError, DeckContinuationRecovery, continuationBlockMessage, continuationRequestFailureMessage, isAuthenticationRejected, createDefenseSessionPayload } from './page';

it('keeps deck intake inside the Practice shell state', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
  expect(source).toContain('<AppShell active="practice">');
});

describe('createDefenseSessionPayload', () => {
  it('uses the validated route-local deck when creating a diagnostic session', () => {
    const deck = { sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide-1.png' }] };
    expect(createDefenseSessionPayload(deck)).toEqual({
      title: 'Thesis.pdf', mode: 'diagnostic', stance: 'rigorous', deck,
    });
  });
});

describe('continuationBlockMessage', () => {
  it('explains why continuation cannot begin without the upload receipt', () => {
    expect(continuationBlockMessage({ hasUser: true, hasDeck: false })).toBe('Your uploaded deck is no longer available. Select it again to continue.');
  });

  it('explains when authentication has expired', () => {
    expect(continuationBlockMessage({ hasUser: false, hasDeck: true })).toBe('Your session has ended. Sign in again to continue.');
  });

  it('allows continuation when both prerequisites exist', () => {
    expect(continuationBlockMessage({ hasUser: true, hasDeck: true })).toBeNull();
  });
});

describe('continuationRequestFailureMessage', () => {
  it('uses persistent sign-in recovery when the session POST is rejected for authentication', () => {
    expect(continuationRequestFailureMessage({ status: 401 }, { error: 'Token expired' })).toBe('Your session has ended. Sign in again to continue.');
    expect(continuationRequestFailureMessage({ status: 403 }, { error: 'Forbidden' })).toBe('Your session has ended. Sign in again to continue.');
  });

  it('keeps non-auth session POST failures retryable with their server message', () => {
    expect(continuationRequestFailureMessage({ status: 500 }, { error: 'The service is busy.' })).toBe('The service is busy.');
  });

  it('renders a sign-in action after the session POST is rejected for authentication', () => {
    const error = continuationRequestFailureMessage({ status: 401 }, { error: 'Token expired' });
    const html = renderToStaticMarkup(<DeckContinuationError error={error ?? ''} authRecovery={isAuthenticationRejected(401)} />);

    expect(html).toContain('Your session has ended. Sign in again to continue.');
    expect(html).toContain('href="/login"');
  });

  it('keeps a 5xx session POST error retryable without a sign-in action', () => {
    const error = continuationRequestFailureMessage({ status: 500 }, { error: 'The service is busy.' });
    const html = renderToStaticMarkup(<DeckContinuationError error={error ?? ''} authRecovery={isAuthenticationRejected(500)} />);

    expect(html).toContain('The service is busy.');
    expect(html).not.toContain('href="/login"');
  });
});

describe('deck continuation UI', () => {
  it('renders deck recovery before sign-in recovery when both prerequisites are absent', () => {
    const html = renderToStaticMarkup(<DeckContinuationRecovery hasUser={false} hasDeck={false} />);

    expect(html).toContain('Your uploaded deck is no longer available. Select it again to continue.');
    expect(html).not.toContain('Your session has ended. Sign in again to continue.');
  });

  it('renders sign-in recovery after a validated receipt loses authentication', () => {
    const html = renderToStaticMarkup(<DeckContinuationRecovery hasUser={false} hasDeck />);

    expect(html).toContain('Your session has ended. Sign in again to continue.');
    expect(html).toContain('href="/login"');
  });

  it('renders a disabled, labelled action while the session request is creating', () => {
    const html = renderToStaticMarkup(<DeckContinuationAction creating error={undefined} onContinue={() => undefined} />);

    expect(html).toContain('disabled=""');
    expect(html).toContain('Creating your defense session...');
  });
});
