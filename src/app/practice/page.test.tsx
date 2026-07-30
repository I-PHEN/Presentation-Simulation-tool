import { describe, expect, it, vi } from 'vitest';
import PracticePage from './page';
import { redirect } from 'next/navigation';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('/practice route', () => {
  it('redirects to /dashboard', () => {
    PracticePage();
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
