import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Bot,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  Loader2,
  Save,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useAIConfigStore, AI_PROVIDERS, type AIProvider } from '@/stores/aiConfigStore';
import { api } from '@/services/api';
import { toast } from 'sonner';

type Tab = 'profile' | 'security' | 'notifications' | 'ai' | 'organization' | 'appearance';

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai', label: 'AI Config', icon: Bot },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { theme, setTheme } = useUIStore();
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  // AI config store — only UI preferences (provider/model), no keys
  const { activeProvider, activeModel, setActiveProvider, setActiveModel } = useAIConfigStore();

  // ── Settings from backend ──────────────────────────────────────────────────
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.getAll(),
  });

  // ── Notifications state ────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    email: true,
    testRunCompletion: true,
    failedTestAlerts: true,
    mentionAlerts: false,
  });

  useEffect(() => {
    if (settings?.notifications) {
      setNotifs(settings.notifications);
    }
  }, [settings]);

  const updateNotifsMutation = useMutation({
    mutationFn: api.settings.updateNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Notification preferences saved');
    },
    onError: () => toast.error('Failed to save notification preferences'),
  });

  const toggleNotif = (key: keyof typeof notifs) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    updateNotifsMutation.mutate(next);
  };

  // ── Profile state ──────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: ({ firstName, lastName }: { firstName: string; lastName: string }) =>
      api.users.updateProfile({ firstName, lastName }),
    onSuccess: (updated) => {
      setUser(updated);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  // ── Security state ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.users.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: () => toast.error('Failed to change password. Check your current password.'),
  });

  // ── Organization state ─────────────────────────────────────────────────────
  const [orgName, setOrgName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  useEffect(() => {
    if (settings?.organization) {
      setOrgName(settings.organization.name ?? '');
      setOrgWebsite(settings.organization.website ?? '');
      setOrgDescription(settings.organization.description ?? '');
    }
  }, [settings]);

  const updateOrgMutation = useMutation({
    mutationFn: api.settings.updateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Organization settings saved');
    },
    onError: () => toast.error('Failed to save organization settings'),
  });

  // ── AI key management ──────────────────────────────────────────────────────
  const [editingKeys, setEditingKeys] = useState<Record<AIProvider, string>>({
    gemini: '', openai: '', anthropic: '',
  });

  const setApiKeyMutation = useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) =>
      api.settings.setApiKey(provider, key),
    onSuccess: (_, { provider }) => {
      setEditingKeys((prev) => ({ ...prev, [provider]: '' }));
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('API key saved securely on server');
    },
    onError: () => toast.error('Failed to save API key'),
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: (provider: string) => api.settings.deleteApiKey(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('API key removed');
    },
    onError: () => toast.error('Failed to remove API key'),
  });

  const updateAiMutation = useMutation({
    mutationFn: api.settings.updateAi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleAiProviderChange = (provider: AIProvider) => {
    setActiveProvider(provider);
    const providerConfig = AI_PROVIDERS.find((p) => p.provider === provider);
    const model = providerConfig?.models[0] ?? '';
    setActiveModel(model);
    updateAiMutation.mutate({ activeProvider: provider, activeModel: model });
  };

  const handleAiModelChange = (model: string) => {
    setActiveModel(model);
    updateAiMutation.mutate({ activeProvider: activeProvider, activeModel: model });
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  const isAdminOrLead = user?.role === 'admin' || user?.role === 'qa_lead';
  const activeProviderConfig = AI_PROVIDERS.find((p) => p.provider === activeProvider);

  // Key status comes from backend only — keys are never stored client-side
  const configuredProviders = settings?.configuredProviders ?? [];
  const isKeyConfigured = (provider: string) =>
    configuredProviders.find((cp) => cp.provider === provider)?.configured ?? false;
  const anyKeyConfigured = configuredProviders.some((cp) => cp.configured);

  return (
    <div className="flex gap-6 max-w-5xl">
      {/* Sidebar navigation */}
      <aside className="w-52 flex-shrink-0">
        <nav className="space-y-1 sticky top-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* ── Profile ─────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <>
            <div>
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="text-sm text-muted-foreground">Your personal information</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Avatar row */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.displayName || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <Badge variant="outline" className="mt-1 capitalize text-xs">
                      {user?.role?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact your admin.</p>
                </div>

                <Button
                  onClick={() => updateProfileMutation.mutate({ firstName, lastName })}
                  disabled={updateProfileMutation.isPending}
                  className="gap-2"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Security ────────────────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <>
            <div>
              <h2 className="text-xl font-semibold">Security</h2>
              <p className="text-sm text-muted-foreground">Manage your password and account security</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </CardTitle>
                <CardDescription>Use a strong password that you don't use elsewhere</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPwd">Current Password</Label>
                  <Input
                    id="currentPwd"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPwd">New Password</Label>
                  <Input
                    id="newPwd"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPwd">Confirm New Password</Label>
                  <Input
                    id="confirmPwd"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
                <Button
                  onClick={() => changePasswordMutation.mutate({ currentPassword, newPassword })}
                  disabled={
                    changePasswordMutation.isPending ||
                    !currentPassword ||
                    newPassword.length < 8 ||
                    newPassword !== confirmPassword
                  }
                  className="gap-2"
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Change Password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Verification</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1',
                      user?.isEmailVerified
                        ? 'text-green-600 border-green-600/30 bg-green-500/10'
                        : 'text-amber-600 border-amber-600/30 bg-amber-500/10'
                    )}
                  >
                    {user?.isEmailVerified ? (
                      <><CheckCircle2 className="h-3 w-3" /> Verified</>
                    ) : (
                      <><AlertCircle className="h-3 w-3" /> Unverified</>
                    )}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Notifications ───────────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <>
            <div>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Choose what notifications you receive</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-0 divide-y">
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {[
                      {
                        key: 'email' as const,
                        title: 'Email Notifications',
                        description: 'Receive email updates about important events',
                      },
                      {
                        key: 'testRunCompletion' as const,
                        title: 'Test Run Completion',
                        description: 'Get notified when a test run finishes',
                      },
                      {
                        key: 'failedTestAlerts' as const,
                        title: 'Failed Test Alerts',
                        description: 'Immediate alerts when tests fail',
                      },
                      {
                        key: 'mentionAlerts' as const,
                        title: 'Mentions',
                        description: 'Get notified when someone mentions you',
                      },
                    ].map(({ key, title, description }) => (
                      <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-sm font-medium">{title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                        </div>
                        <Switch
                          checked={notifs[key]}
                          onCheckedChange={() => toggleNotif(key)}
                          disabled={updateNotifsMutation.isPending}
                        />
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── AI Config ───────────────────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">AI Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Configure AI providers for test case generation and analysis
                </p>
              </div>
              {anyKeyConfigured ? (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30 bg-green-500/10">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600/30 bg-amber-500/10">
                  <AlertCircle className="h-3 w-3" /> Not configured
                </Badge>
              )}
            </div>

            {/* Active provider & model */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Active Provider
                </CardTitle>
                <CardDescription>
                  Choose which AI provider powers test generation features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={activeProvider} onValueChange={(v) => handleAiProviderChange(v as AIProvider)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((p) => (
                        <SelectItem key={p.provider} value={p.provider}>
                          <div className="flex items-center gap-2">
                            <span>{p.label}</span>
                            {isKeyConfigured(p.provider) && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{activeProviderConfig?.description}</p>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={activeModel} onValueChange={handleAiModelChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviderConfig?.models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* API Keys per provider */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Keys are encrypted and stored securely on the server
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {AI_PROVIDERS.map((provider) => {
                  const configured = isKeyConfigured(provider.provider);
                  const isActive = activeProvider === provider.provider;
                  const currentEditKey = editingKeys[provider.provider];

                  return (
                    <Card
                      key={provider.provider}
                      className={cn(
                        'border',
                        isActive ? 'border-primary/40 bg-primary/5' : 'border-border'
                      )}
                    >
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{provider.label}</span>
                            {isActive && (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            )}
                          </div>
                          {configured && (
                            <Badge
                              variant="outline"
                              className="gap-1 text-green-600 border-green-600/30 text-xs"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Key set
                            </Badge>
                          )}
                        </div>

                        {configured ? (
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono text-muted-foreground">
                              ••••••••••••••••••••••••••••••••
                            </code>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Stored on server</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteApiKeyMutation.mutate(provider.provider)}
                              disabled={deleteApiKeyMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder={`Enter ${provider.label} API key...`}
                              value={currentEditKey}
                              onChange={(e) =>
                                setEditingKeys((prev) => ({
                                  ...prev,
                                  [provider.provider]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && currentEditKey.trim()) {
                                  setApiKeyMutation.mutate({
                                    provider: provider.provider,
                                    key: currentEditKey.trim(),
                                  });
                                }
                              }}
                              className="flex-1 font-mono text-xs"
                            />
                            <Button
                              size="sm"
                              onClick={() =>
                                setApiKeyMutation.mutate({
                                  provider: provider.provider,
                                  key: currentEditKey.trim(),
                                })
                              }
                              disabled={!currentEditKey.trim() || setApiKeyMutation.isPending}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Organization ─────────────────────────────────────────────────── */}
        {activeTab === 'organization' && (
          <>
            <div>
              <h2 className="text-xl font-semibold">Organization</h2>
              <p className="text-sm text-muted-foreground">Manage your organization's settings</p>
            </div>

            {!isAdminOrLead && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <CardContent className="pt-4 pb-4 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">Only admins and QA leads can modify organization settings.</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6 space-y-4">
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={!isAdminOrLead}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgWebsite">Website</Label>
                      <Input
                        id="orgWebsite"
                        type="url"
                        placeholder="https://example.com"
                        value={orgWebsite}
                        onChange={(e) => setOrgWebsite(e.target.value)}
                        disabled={!isAdminOrLead}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgDesc">Description</Label>
                      <Textarea
                        id="orgDesc"
                        placeholder="Brief description of your organization..."
                        value={orgDescription}
                        onChange={(e) => setOrgDescription(e.target.value)}
                        disabled={!isAdminOrLead}
                        rows={3}
                      />
                    </div>
                    {isAdminOrLead && (
                      <Button
                        onClick={() =>
                          updateOrgMutation.mutate({
                            name: orgName,
                            website: orgWebsite || undefined,
                            description: orgDescription || undefined,
                          })
                        }
                        disabled={updateOrgMutation.isPending || !orgName.trim()}
                        className="gap-2"
                      >
                        {updateOrgMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Organization
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <>
            <div>
              <h2 className="text-xl font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize how TestFlow looks</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Theme</CardTitle>
                <CardDescription>Select your preferred color scheme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value as 'light' | 'dark')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                        theme === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40 hover:bg-muted'
                      )}
                    >
                      <Icon className={cn('h-6 w-6', theme === value ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('text-sm font-medium', theme === value ? 'text-primary' : 'text-muted-foreground')}>
                        {label}
                      </span>
                      {theme === value && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Currently using <span className="font-medium capitalize">{theme}</span> mode
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
