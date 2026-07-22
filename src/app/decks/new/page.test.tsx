import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SignInRecovery, isAuthenticationRejected, sessionCreateFailureMessage } from './page';

describe('rehearse setup route', () => {
  it('keeps the unified configure screen inside the Rehearse shell state', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
    expect(source).toContain('<AppShell active="rehearse">');
    expect(source).toContain('<RehearseSetup');
  });

  it('creates a fully-configured session and enters the immersive room in one step', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
    // One-shot: straight into the immersive /rehearse room, never the intermediate setup view.
    expect(source).toContain('/rehearse/');
    expect(source).not.toContain('?view=setup');
    expect(source).toContain('buildRehearseSessionPayload');
  });

  it('clears a stale create error when the user picks a new deck', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
    expect(source).toContain('onDeckChange={() => setError(undefined)}');
  });
});

describe('sessionCreateFailureMessage', () => {
  it('routes authentication rejections to persistent sign-in recovery', () => {
    expect(sessionCreateFailureMessage({ status: 401 }, { error: 'Token expired' })).toBe('Your session has ended. Sign in again to continue.');
    expect(sessionCreateFailureMessage({ status: 403 }, { error: 'Forbidden' })).toBe('Your session has ended. Sign in again to continue.');
  });

  it('keeps non-auth failures retryable with their server message', () => {
    expect(sessionCreateFailureMessage({ status: 500 }, { error: 'The service is busy.' })).toBe('The service is busy.');
  });

  it('falls back to a generic message when the server gives none', () => {
    expect(sessionCreateFailureMessage({ status: 500 }, {})).toBe('Unable to create the rehearsal session.');
  });

  it('returns null for a successful response', () => {
    expect(sessionCreateFailureMessage({ status: 200 }, { sessionId: 's1' })).toBeNull();
  });
});

describe('isAuthenticationRejected', () => {
  it('treats 401 and 403 as authentication rejections', () => {
    expect(isAuthenticationRejected(401)).toBe(true);
    expect(isAuthenticationRejected(403)).toBe(true);
    expect(isAuthenticationRejected(500)).toBe(false);
  });
});

describe('SignInRecovery', () => {
  it('renders the sign-in recovery alert with a login link', () => {
    const html = renderToStaticMarkup(<SignInRecovery />);
    expect(html).toContain('Your session has ended. Sign in again to continue.');
    expect(html).toContain('href="/login"');
    expect(html).toContain('role="alert"');
  });
});
