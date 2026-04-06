import { useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Globe, KeyRound, Variable, Loader2, ServerCrash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  useEnvironments, useCreateEnvironment, useUpdateEnvironment, useDeleteEnvironment,
} from '@/hooks/useEnvironments';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import type { ProjectEnvironment, AuthConfig } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnvironmentsPanelProps {
  projectId: string;
  canManage: boolean;
}

interface EnvironmentFormData {
  name: string;
  baseUrl: string;
  isDefault: boolean;
  authConfigs: AuthConfig[];
  variables: { key: string; value: string }[];
}

const EMPTY_AUTH_CONFIG: AuthConfig = { label: '', username: '', password: '', role: '' };
const EMPTY_VARIABLE = { key: '', value: '' };

const buildFormData = (env?: ProjectEnvironment): EnvironmentFormData => {
  if (!env) {
    return {
      name: '',
      baseUrl: '',
      isDefault: false,
      authConfigs: [],
      variables: [],
    };
  }
  return {
    name: env.name,
    baseUrl: env.baseUrl,
    isDefault: env.isDefault,
    authConfigs: env.authConfigs.map((a) => ({ ...a })),
    variables: Object.entries(env.variables).map(([key, value]) => ({ key, value })),
  };
};

// ─── EnvironmentCard ──────────────────────────────────────────────────────────

function EnvironmentCard({
  environment,
  canManage,
  onEdit,
  onDelete,
}: {
  environment: ProjectEnvironment;
  canManage: boolean;
  onEdit: (env: ProjectEnvironment) => void;
  onDelete: (env: ProjectEnvironment) => void;
}) {
  const variableCount = Object.keys(environment.variables).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">{environment.name}</CardTitle>
          {environment.isDefault && (
            <Badge variant="secondary" className="text-xs">Default</Badge>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(environment)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(environment)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4 shrink-0" />
          <code className="font-mono text-xs truncate">{environment.baseUrl}</code>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <KeyRound className="h-3.5 w-3.5" />
            {environment.authConfigs.length} auth config{environment.authConfigs.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Variable className="h-3.5 w-3.5" />
            {variableCount} variable{variableCount !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── EnvironmentDialog ────────────────────────────────────────────────────────

function EnvironmentDialog({
  open,
  onOpenChange,
  environment,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment?: ProjectEnvironment;
  onSave: (data: EnvironmentFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EnvironmentFormData>(() => buildFormData(environment));

  // Reset form when dialog opens with new data
  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (value) {
        setForm(buildFormData(environment));
      }
      onOpenChange(value);
    },
    [environment, onOpenChange],
  );

  const updateField = useCallback(
    <K extends keyof EnvironmentFormData>(key: K, value: EnvironmentFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Auth config handlers ──

  const addAuthConfig = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      authConfigs: [...prev.authConfigs, { ...EMPTY_AUTH_CONFIG }],
    }));
  }, []);

  const updateAuthConfig = useCallback(
    (index: number, field: keyof AuthConfig, value: string) => {
      setForm((prev) => {
        const updated = [...prev.authConfigs];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, authConfigs: updated };
      });
    },
    [],
  );

  const removeAuthConfig = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      authConfigs: prev.authConfigs.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Variable handlers ──

  const addVariable = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      variables: [...prev.variables, { ...EMPTY_VARIABLE }],
    }));
  }, []);

  const updateVariable = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      setForm((prev) => {
        const updated = [...prev.variables];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, variables: updated };
      });
    },
    [],
  );

  const removeVariable = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Submit ──

  const handleSubmit = useCallback(() => {
    if (!form.name.trim() || !form.baseUrl.trim()) return;
    onSave(form);
  }, [form, onSave]);

  const isEditing = !!environment;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Environment' : 'Add Environment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the environment configuration.'
              : 'Create a new environment for this project.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="env-name">Name *</Label>
              <Input
                id="env-name"
                placeholder="e.g. Staging"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-url">Base URL *</Label>
              <Input
                id="env-url"
                placeholder="https://staging.example.com"
                value={form.baseUrl}
                onChange={(e) => updateField('baseUrl', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="env-default"
              checked={form.isDefault}
              onCheckedChange={(checked) => updateField('isDefault', !!checked)}
            />
            <Label htmlFor="env-default" className="cursor-pointer">
              Set as default environment
            </Label>
          </div>

          <Separator />

          {/* Auth Configs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Auth Configs</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAuthConfig}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            {form.authConfigs.length === 0 && (
              <p className="text-sm text-muted-foreground">No auth configs added.</p>
            )}
            {form.authConfigs.map((auth, idx) => (
              <div key={idx} className="grid gap-2 rounded-md border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      placeholder="Admin"
                      value={auth.label}
                      onChange={(e) => updateAuthConfig(idx, 'label', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role (optional)</Label>
                    <Input
                      placeholder="admin"
                      value={auth.role ?? ''}
                      onChange={(e) => updateAuthConfig(idx, 'role', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Username</Label>
                    <Input
                      placeholder="username"
                      value={auth.username}
                      onChange={(e) => updateAuthConfig(idx, 'username', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      placeholder="password"
                      value={auth.password}
                      onChange={(e) => updateAuthConfig(idx, 'password', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeAuthConfig(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Variables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Variables</Label>
              <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            {form.variables.length === 0 && (
              <p className="text-sm text-muted-foreground">No variables added.</p>
            )}
            {form.variables.map((variable, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Key</Label>
                  <Input
                    placeholder="API_KEY"
                    value={variable.key}
                    onChange={(e) => updateVariable(idx, 'key', e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input
                    placeholder="value"
                    value={variable.value}
                    onChange={(e) => updateVariable(idx, 'value', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => removeVariable(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !form.name.trim() || !form.baseUrl.trim()}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Environment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EnvironmentsPanel ────────────────────────────────────────────────────────

export function EnvironmentsPanel({ projectId, canManage }: EnvironmentsPanelProps) {
  const { data: environments, isLoading, isError } = useEnvironments(projectId);
  const createMutation = useCreateEnvironment();
  const updateMutation = useUpdateEnvironment();
  const deleteMutation = useDeleteEnvironment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<ProjectEnvironment | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ProjectEnvironment | undefined>();

  // ── Handlers ──

  const handleAdd = useCallback(() => {
    setEditingEnv(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((env: ProjectEnvironment) => {
    setEditingEnv(env);
    setDialogOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((env: ProjectEnvironment) => {
    setDeleteTarget(env);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { projectId, id: deleteTarget.id },
      { onSettled: () => setDeleteTarget(undefined) },
    );
  }, [deleteTarget, deleteMutation, projectId]);

  const handleSave = useCallback(
    (data: EnvironmentFormData) => {
      const payload: Partial<ProjectEnvironment> = {
        name: data.name,
        baseUrl: data.baseUrl,
        isDefault: data.isDefault,
        authConfigs: data.authConfigs,
        variables: data.variables.reduce<Record<string, string>>((acc, v) => {
          if (v.key.trim()) acc[v.key.trim()] = v.value;
          return acc;
        }, {}),
      };

      const onSuccess = () => setDialogOpen(false);

      if (editingEnv) {
        updateMutation.mutate(
          { projectId, id: editingEnv.id, data: payload },
          { onSuccess },
        );
      } else {
        createMutation.mutate({ projectId, data: payload }, { onSuccess });
      }
    },
    [editingEnv, projectId, createMutation, updateMutation],
  );

  // ── Render ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <ServerCrash className="h-8 w-8" />
        <p className="text-sm">Failed to load environments.</p>
      </div>
    );
  }

  const envList = environments ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Environments</h3>
        {canManage && (
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Environment
          </Button>
        )}
      </div>

      {envList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Globe className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">No environments yet</p>
            <p className="text-xs mt-1">
              {canManage
                ? 'Add an environment to configure base URLs, auth, and variables.'
                : 'No environments have been configured for this project.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {envList.map((env) => (
            <EnvironmentCard
              key={env.id}
              environment={env}
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <EnvironmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        environment={editingEnv}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(undefined); }}
        title="Delete Environment"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
