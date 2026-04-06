import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Eye, EyeOff, FlaskConical, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DEV_CREDENTIALS = [
  { label: 'Admin', email: 'admin@testflow.dev', password: 'Admin@1234', variant: 'destructive' as const },
  { label: 'QA Lead', email: 'qalead@testflow.dev', password: 'QaLead@1234', variant: 'default' as const },
  { label: 'Tester', email: 'tester@testflow.dev', password: 'Tester@1234', variant: 'secondary' as const },
  { label: 'Viewer', email: 'viewer@testflow.dev', password: 'Viewer@1234', variant: 'outline' as const },
];

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { accessToken, refreshToken, user } = await api.auth.login(email, password);
      login(user, accessToken, refreshToken);
      // Force fresh permission fetch for the newly logged-in user
      queryClient.invalidateQueries({ queryKey: ['rbac', 'my-permissions'] });
      toast.success(`Welcome back, ${user.displayName}!`, {
        description: `Signed in as ${user.role.replace('_', ' ')}`,
      });
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('Login failed', {
        description: error instanceof Error ? error.message : 'Invalid email or password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (cred: typeof DEV_CREDENTIALS[number]) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <FlaskConical className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to TestFlow</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dev quick-select */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Quick login (dev seed users)</p>
            <div className="flex flex-wrap gap-2">
              {DEV_CREDENTIALS.map((cred) => (
                <Badge
                  key={cred.label}
                  variant={cred.variant}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => fillCredentials(cred)}
                >
                  {cred.label}
                </Badge>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                    : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
