import { useState } from 'react';
import { 
  Link2, 
  CheckCircle2, 
  XCircle, 
  Settings2, 
  ExternalLink,
  RefreshCw
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

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  config?: {
    url?: string;
    projectKey?: string;
    syncEnabled?: boolean;
  };
}

const initialIntegrations: Integration[] = [
  {
    id: 'jira',
    name: 'Jira',
    description: 'Link test cases to Jira issues and sync defects',
    icon: '🔷',
    connected: false,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Connect to GitLab for CI/CD integration and issue tracking',
    icon: '🦊',
    connected: false,
  },
];

export const Integrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [configDialog, setConfigDialog] = useState<Integration | null>(null);
  const [formData, setFormData] = useState({
    url: '',
    projectKey: '',
    token: '',
    syncEnabled: true,
  });

  const handleConnect = (integration: Integration) => {
    setFormData({
      url: integration.config?.url || '',
      projectKey: integration.config?.projectKey || '',
      token: '',
      syncEnabled: integration.config?.syncEnabled ?? true,
    });
    setConfigDialog(integration);
  };

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: false, config: undefined } : i))
    );
    toast.success('Integration disconnected');
  };

  const handleSaveConfig = () => {
    if (!configDialog) return;

    if (!formData.url || !formData.token) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === configDialog.id
          ? {
              ...i,
              connected: true,
              config: {
                url: formData.url,
                projectKey: formData.projectKey,
                syncEnabled: formData.syncEnabled,
              },
            }
          : i
      )
    );

    setConfigDialog(null);
    toast.success(`${configDialog.name} connected successfully`);
  };

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
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleConnect(integration)}
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full gap-2" onClick={() => handleConnect(integration)}>
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
          <div className="text-center py-6 text-muted-foreground">
            <p>Connect an integration to see sync status</p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configDialog?.icon} Configure {configDialog?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your {configDialog?.name} credentials to connect
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">{configDialog?.name} URL *</Label>
              <Input
                id="url"
                placeholder={
                  configDialog?.id === 'jira'
                    ? 'https://your-domain.atlassian.net'
                    : 'https://gitlab.com'
                }
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">API Token *</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter your API token"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                <a
                  href={
                    configDialog?.id === 'jira'
                      ? 'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/'
                      : 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html'
                  }
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
              <Label htmlFor="projectKey">
                {configDialog?.id === 'jira' ? 'Project Key' : 'Project Path'}
              </Label>
              <Input
                id="projectKey"
                placeholder={configDialog?.id === 'jira' ? 'PROJ' : 'group/project'}
                value={formData.projectKey}
                onChange={(e) => setFormData({ ...formData, projectKey: e.target.value })}
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
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, syncEnabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>
              {configDialog?.connected ? 'Save Changes' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
