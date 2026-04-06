import { useState } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  Settings2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Wifi,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useJiraConfig,
  useSaveJiraConfig,
  useDisconnectJira,
  useTestJiraConnection,
  useVerifyJiraCredentials,
} from '@/hooks/useIntegrations';

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'error';

export const Integrations = () => {
  const { data: jiraConfig, isLoading } = useJiraConfig();
  const saveConfig = useSaveJiraConfig();
  const disconnect = useDisconnectJira();
  const testConnection = useTestJiraConnection();
  const verifyCredentials = useVerifyJiraCredentials();

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    email: '',
    token: '',
    projectKey: '',
    syncEnabled: true,
  });
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const jiraConnected = jiraConfig?.connected ?? false;

  const resetVerifyState = () => {
    setVerifyStatus('idle');
    setVerifiedUser(null);
    setVerifyError(null);
  };

  const handleConnect = () => {
    setFormData({
      url: jiraConfig?.baseUrl || '',
      email: jiraConfig?.email || '',
      token: '',
      projectKey: jiraConfig?.defaultProjectKey || '',
      syncEnabled: jiraConfig?.syncEnabled ?? true,
    });
    resetVerifyState();
    setConfigDialogOpen(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success('Jira disconnected');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect');
    }
  };

  const handleFormChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Reset verification when credentials change
    if ('url' in updates || 'email' in updates || 'token' in updates) {
      resetVerifyState();
    }
  };

  const canVerify = formData.url && formData.email && formData.token;

  const handleVerify = async () => {
    if (!canVerify) {
      toast.error('Please fill in URL, email, and API token first');
      return;
    }

    setVerifyStatus('verifying');
    setVerifyError(null);
    setVerifiedUser(null);

    try {
      const result = await verifyCredentials.mutateAsync({
        baseUrl: formData.url,
        email: formData.email,
        apiToken: formData.token,
        defaultProjectKey: formData.projectKey || undefined,
        syncEnabled: formData.syncEnabled,
      });
      setVerifyStatus('success');
      setVerifiedUser(result.user.displayName);
    } catch (err: any) {
      setVerifyStatus('error');
      setVerifyError(err.message || 'Connection failed. Check your credentials and try again.');
    }
  };

  const handleSaveConfig = async () => {
    if (!canVerify) {
      toast.error('Please fill in all required fields');
      return;
    }

    // If not yet verified, verify first
    if (verifyStatus !== 'success') {
      setVerifyStatus('verifying');
      setVerifyError(null);
      setVerifiedUser(null);

      try {
        const result = await verifyCredentials.mutateAsync({
          baseUrl: formData.url,
          email: formData.email,
          apiToken: formData.token,
          defaultProjectKey: formData.projectKey || undefined,
          syncEnabled: formData.syncEnabled,
        });
        setVerifyStatus('success');
        setVerifiedUser(result.user.displayName);
      } catch (err: any) {
        setVerifyStatus('error');
        setVerifyError(err.message || 'Connection failed. Check your credentials and try again.');
        return; // Don't save if verification fails
      }
    }

    // Verification passed — now save
    try {
      await saveConfig.mutateAsync({
        baseUrl: formData.url,
        email: formData.email,
        apiToken: formData.token,
        defaultProjectKey: formData.projectKey || undefined,
        syncEnabled: formData.syncEnabled,
      });
      setConfigDialogOpen(false);
      toast.success('Jira connected successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    }
  };

  const handleTestExistingConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      toast.success(`Connection verified! Authenticated as ${result.user.displayName}`);
    } catch (err: any) {
      toast.error(err.message || 'Connection test failed');
    }
  };

  const integrations = [
    {
      id: 'jira',
      name: 'Jira',
      description: 'Link test cases to Jira issues and sync defects',
      icon: '🔷',
      connected: jiraConnected,
      config: jiraConnected ? {
        url: jiraConfig?.baseUrl,
        email: jiraConfig?.email,
        projectKey: jiraConfig?.defaultProjectKey,
        syncEnabled: jiraConfig?.syncEnabled,
        connectedAt: jiraConfig?.connectedAt,
      } : undefined,
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'Connect to GitLab for CI/CD integration and issue tracking',
      icon: '🦊',
      connected: false,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBusy = verifyCredentials.isPending || saveConfig.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect TestFlow with your favorite tools
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{integration.icon}</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {integration.name}
                      {integration.connected ? (
                        <Badge className="bg-success text-success-foreground gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Not Connected
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {integration.connected && integration.config ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">URL</span>
                      <span className="font-mono text-xs truncate max-w-[200px]">
                        {integration.config.url}
                      </span>
                    </div>
                    {integration.config.email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Email</span>
                        <span className="text-xs truncate max-w-[200px]">
                          {integration.config.email}
                        </span>
                      </div>
                    )}
                    {integration.config.projectKey && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Project</span>
                        <span className="font-medium">{integration.config.projectKey}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Auto Sync</span>
                      <Badge variant={integration.config.syncEnabled ? 'default' : 'secondary'}>
                        {integration.config.syncEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    {integration.config.connectedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Connected</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(integration.config.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleConnect}
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDisconnect}
                      disabled={disconnect.isPending}
                    >
                      {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={integration.id === 'jira' ? handleConnect : undefined}
                  disabled={integration.id !== 'jira'}
                >
                  <Link2 className="h-4 w-4" />
                  Connect {integration.name}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jiraConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Jira integration is active
                {jiraConfig?.connectedAt && (
                  <span>· Connected since {new Date(jiraConfig.connectedAt).toLocaleDateString()}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestExistingConnection}
                disabled={testConnection.isPending}
                className="gap-1"
              >
                {testConnection.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wifi className="h-3 w-3" />
                )}
                Verify
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Connect an integration to see sync status</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔷 Configure Jira
            </DialogTitle>
            <DialogDescription>
              Enter your Jira Cloud credentials to connect
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Jira URL *</Label>
              <Input
                id="url"
                placeholder="https://your-domain.atlassian.net"
                value={formData.url}
                onChange={(e) => handleFormChange({ url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@company.com"
                value={formData.email}
                onChange={(e) => handleFormChange({ email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">API Token *</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter your Jira API token"
                value={formData.token}
                onChange={(e) => handleFormChange({ token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                <a
                  href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  How to generate a token
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectKey">Default Project Key</Label>
              <Input
                id="projectKey"
                placeholder="PROJ"
                value={formData.projectKey}
                onChange={(e) => handleFormChange({ projectKey: e.target.value })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Sync</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync issues and defects
                </p>
              </div>
              <Switch
                checked={formData.syncEnabled}
                onCheckedChange={(checked) => handleFormChange({ syncEnabled: checked })}
              />
            </div>

            {/* Connection verification status banner */}
            {verifyStatus === 'verifying' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                <span>Verifying connection to Jira...</span>
              </div>
            )}

            {verifyStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <span className="font-medium text-green-700 dark:text-green-400">Connection verified</span>
                  {verifiedUser && (
                    <span className="text-muted-foreground"> — authenticated as {verifiedUser}</span>
                  )}
                </div>
              </div>
            )}

            {verifyStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                <ShieldX className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <span className="font-medium text-destructive">Connection failed</span>
                  {verifyError && (
                    <p className="text-xs text-muted-foreground mt-0.5">{verifyError}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleVerify}
              disabled={!canVerify || isBusy}
              className="gap-2"
            >
              {verifyCredentials.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : verifyStatus === 'success' ? (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              Test Connection
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfig} disabled={!canVerify || isBusy}>
                {saveConfig.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {jiraConnected ? 'Save Changes' : 'Connect'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
