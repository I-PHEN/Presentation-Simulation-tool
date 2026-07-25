import { describe, expect, it } from 'vitest';
import { shouldRedirectToWelcome } from './use-onboarding';

describe('shouldRedirectToWelcome', () => {
  it('redirects a first-run user (no onboarding stamp) away from other pages', () => {
    expect(shouldRedirectToWelcome(null, '/dashboard')).toBe(true);
    expect(shouldRedirectToWelcome(null, '/decks/new')).toBe(true);
  });

  it('never redirects when already on /welcome (no loop)', () => {
    expect(shouldRedirectToWelcome(null, '/welcome')).toBe(false);
  });

  it('leaves an onboarded user in place', () => {
    expect(shouldRedirectToWelcome('2026-07-25T00:00:00.000Z', '/dashboard')).toBe(false);
  });

  it('does not redirect before the onboarding stamp has been fetched', () => {
    expect(shouldRedirectToWelcome(undefined, '/dashboard')).toBe(false);
  });
});
