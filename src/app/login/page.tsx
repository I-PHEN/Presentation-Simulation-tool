'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading, loginAsMock } = useAuth();

  useEffect(() => {
    setConfigured(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMsg = 'Failed to sign in. Please check your credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid credentials provided.';
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_70%)]"
      />

      <div className="relative z-10 w-full max-w-md space-y-4">
        {/* Brand lockup */}
        <div className="mb-2 flex flex-col items-center gap-2 text-center">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-e1"
          >
            SP
          </span>
          <div className="space-y-0.5">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Sparring Partner</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Presentation & Interview Coach</p>
          </div>
        </div>

        {/* Configuration Warning */}
        {!configured && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Firebase Not Configured</p>
              <p className="leading-relaxed text-muted-foreground">
                Your project environment keys are missing. Please add Firebase variables to your `.env` file. You can register/login with mock details in development.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-8 shadow-e2">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Sign In</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email and password to access your dashboard
            </p>
          </div>
          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 rounded-lg text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-3">
              <Button type="submit" className="w-full h-9 text-xs font-medium" disabled={loading}>
                {loading ? (
                  <><Loader2 className="size-3.5 animate-spin mr-1.5" />Signing In...</>
                ) : (
                  'Sign In'
                )}
              </Button>
              <div className="w-full space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">Or continue with</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    loginAsMock('Guest Presenter');
                    toast.success('Logged in as Guest!');
                  }}
                  className="w-full h-9 text-xs border-dashed"
                >
                  <Sparkles className="size-3.5 text-primary mr-1.5" /> Guest Mode (No Account Required)
                </Button>
              </div>
              <div className="text-xs text-center text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
