'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Swords, AlertCircle } from 'lucide-react';

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
    <div className="h-screen w-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background dynamic ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-chart-2/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 size-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-chart-2/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-4">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center space-y-1.5 mb-2">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Swords className="size-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Sparring Partner</h1>
          <p className="text-xs text-muted-foreground">AI-Powered Presentation & Interview Coach</p>
        </div>

        {/* Configuration Warning */}
        {!configured && (
          <Card className="border-warning/30 bg-warning/5 border">
            <CardContent className="p-3 flex items-start gap-2.5 text-warning">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold">Firebase Not Configured</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Your project environment keys are missing. Please add Firebase variables to your `.env` file. You can register/login with mock details in development.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/40 bg-surface/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Create Account</CardTitle>
            <CardDescription className="text-xs">
              Get started by creating your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50 h-9 text-sm"
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
                  className="bg-background/50 h-9 text-sm"
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
                  className="bg-background/50 h-9 text-sm"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
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
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
