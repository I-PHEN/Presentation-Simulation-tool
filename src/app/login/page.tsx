'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Swords, AlertCircle, Sparkles } from 'lucide-react';

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
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your email and password to access your dashboard
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-3">
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
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                </div>
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
                  <><Loader2 className="size-3.5 animate-spin mr-1.5" />Signing In...</>
                ) : (
                  'Sign In'
                )}
              </Button>
              <div className="w-full text-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">Or continue with</span>
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
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
