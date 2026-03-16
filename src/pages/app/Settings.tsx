import { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Building2,
  Users,
  Bot,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useAIConfigStore, AI_PROVIDERS, type AIProvider } from '@/stores/aiConfigStore';
import { useToast } from '@/hooks/use-toast';

export const Settings = () => {
  const { theme } = useUIStore();
  const { user } = useAuthStore();
  const { activeProvider, activeModel, apiKeys, setActiveProvider, setActiveModel, setApiKey, isConfigured } = useAIConfigStore();
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<Record<AIProvider, boolean>>({ gemini: false, openai: false, anthropic: false });
  const [editingKey, setEditingKey] = useState<string>('');

  const activeProviderConfig = AI_PROVIDERS.find(p => p.provider === activeProvider);

  const toggleKeyVisibility = (provider: AIProvider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSaveKey = (provider: AIProvider) => {
    if (editingKey.trim()) {
      setApiKey(provider, editingKey.trim());
      setEditingKey('');
      toast({ title: 'API Key saved', description: `${AI_PROVIDERS.find(p => p.provider === provider)?.label} key has been saved securely.` });
    }
  };

  const handleRemoveKey = (provider: AIProvider) => {
    setApiKey(provider, '');
    toast({ title: 'API Key removed', description: `${AI_PROVIDERS.find(p => p.provider === provider)?.label} key has been removed.` });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      {/* AI Configuration */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>AI Configuration</CardTitle>
            {isConfigured() ? (
              <Badge variant="outline" className="ml-auto gap-1 text-green-600 border-green-600/30 bg-green-500/10">
                <CheckCircle2 className="h-3 w-3" /> Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto gap-1 text-amber-600 border-amber-600/30 bg-amber-500/10">
                <AlertCircle className="h-3 w-3" /> Not configured
              </Badge>
            )}
          </div>
          <CardDescription>
            Configure your AI provider to enable features like test case generation from Jira tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Provider */}
          <div className="space-y-2">
            <Label>Active AI Provider</Label>
            <Select value={activeProvider} onValueChange={(v) => setActiveProvider(v as AIProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(p => (
                  <SelectItem key={p.provider} value={p.provider}>
                    <div className="flex items-center gap-2">
                      <span>{p.label}</span>
                      {apiKeys[p.provider] && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{activeProviderConfig?.description}</p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={activeModel} onValueChange={setActiveModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeProviderConfig?.models.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* API Keys for all providers */}
          <div className="space-y-4">
            <Label className="text-base font-medium">API Keys</Label>
            <p className="text-sm text-muted-foreground -mt-2">
              Keys are stored locally in your browser and never sent to our servers
            </p>

            {AI_PROVIDERS.map(provider => (
              <Card key={provider.provider} className={`border ${activeProvider === provider.provider ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{provider.label}</span>
                      {activeProvider === provider.provider && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                    {apiKeys[provider.provider] && (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30 text-xs">
                        <CheckCircle2 className="h-3 w-3" /> Key set
                      </Badge>
                    )}
                  </div>

                  {apiKeys[provider.provider] ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono">
                        {showKeys[provider.provider] ? apiKeys[provider.provider] : maskKey(apiKeys[provider.provider])}
                      </code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleKeyVisibility(provider.provider)}>
                        {showKeys[provider.provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveKey(provider.provider)}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={`Enter ${provider.label} API key...`}
                        value={editingKey}
                        onChange={(e) => setEditingKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveKey(provider.provider)}
                        className="flex-1 font-mono text-xs"
                      />
                      <Button size="sm" onClick={() => handleSaveKey(provider.provider)} disabled={!editingKey.trim()}>
                        Save
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>
            Your personal information and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user?.name || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email || ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" defaultValue={user?.role?.replace('_', ' ').toUpperCase() || ''} disabled />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Organization</CardTitle>
          </div>
          <CardDescription>
            Manage your organization settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input id="org-name" defaultValue="Acme Corp" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Team Members</p>
              <p className="text-sm text-muted-foreground">Manage who has access</p>
            </div>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Manage Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize how TestFlow looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Currently using {theme} mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive email updates about test runs
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Test Run Completion</p>
              <p className="text-sm text-muted-foreground">
                Get notified when test runs complete
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Failed Test Alerts</p>
              <p className="text-sm text-muted-foreground">
                Immediate alerts for failed tests
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
