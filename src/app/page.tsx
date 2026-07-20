'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-e1"
      >
        SP
      </span>
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}
