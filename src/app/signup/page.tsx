'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    setConfigured(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name in Firebase profile
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }

      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMsg = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'The password is too weak.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
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
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Create Account</h2>
            <p className="text-sm text-muted-foreground">
              Get started by creating your account
            </p>
          </div>
          <form onSubmit={handleSignup} className="mt-6 space-y-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 rounded-lg text-sm"
                  required
                />
              </div>
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
                <Label htmlFor="password" className="text-xs">Password (6+ characters)</Label>
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
                  <><Loader2 className="size-3.5 animate-spin mr-1.5" />Creating Account...</>
                ) : (
                  'Create Account'
                )}
              </Button>
              <div className="text-xs text-center text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
