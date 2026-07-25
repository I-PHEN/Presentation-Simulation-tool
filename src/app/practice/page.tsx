import { redirect } from 'next/navigation';

/**
 * The Practice hub is retired: Home is now the single dashboard (active
 * programme, resume, and recent sessions) and Rehearse is the single place
 * to start a new one. Any lingering link to /practice lands on Home.
 */
export default function PracticePage() {
  redirect('/dashboard');
}
