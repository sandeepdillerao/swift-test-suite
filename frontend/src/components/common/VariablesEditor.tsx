import { useState } from 'react';
import { Plus, Trash2, Variable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  value: Record<string, string>;
  onChange: (vars: Record<string, string>) => void;
  label?: string;
  description?: string;
  inheritedVars?: Record<string, string>;
  inheritedFrom?: string;
  readOnly?: boolean;
  className?: string;
}

export function VariablesEditor({
  value,
  onChange,
  label = 'Variables',
  description,
  inheritedVars,
  inheritedFrom,
  readOnly = false,
  className,
}: Props) {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const entries = Object.entries(value);
  const inherited = inheritedVars ? Object.entries(inheritedVars) : [];

  const handleAdd = () => {
    const key = newKey.trim().toUpperCase().replace(/\s+/g, '_');
    if (!key) return;
    onChange({ ...value, [key]: newVal.trim() });
    setNewKey('');
    setNewVal('');
  };

  const handleRemove = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const handleUpdate = (key: string, field: 'key' | 'val', raw: string) => {
    const next = { ...value };
    if (field === 'key') {
      const newK = raw.toUpperCase().replace(/\s+/g, '_');
      delete next[key];
      next[newK] = value[key] ?? '';
    } else {
      next[key] = raw;
    }
    onChange(next);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <div className="flex items-center gap-2">
          <Variable className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">{label}</Label>
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{description}</p>}
      </div>

      {/* Inherited variables (read-only) */}
      {inherited.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Inherited from {inheritedFrom ?? 'parent'}
          </p>
          {inherited.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 opacity-60">
              <Input value={k} readOnly className="h-7 text-xs font-mono flex-1 bg-muted" />
              <span className="text-muted-foreground">=</span>
              <Input
                value={value[k] !== undefined ? value[k] : v}
                readOnly
                className="h-7 text-xs font-mono flex-1 bg-muted"
              />
            </div>
          ))}
        </div>
      )}

      {/* Own variables */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {inherited.length > 0 && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              This level
            </p>
          )}
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <Input
                value={k}
                readOnly={readOnly}
                onChange={(e) => handleUpdate(k, 'key', e.target.value)}
                className="h-7 text-xs font-mono flex-1"
                placeholder="KEY"
              />
              <span className="text-muted-foreground text-xs">=</span>
              <Input
                value={v}
                readOnly={readOnly}
                onChange={(e) => handleUpdate(k, 'val', e.target.value)}
                className="h-7 text-xs font-mono flex-1"
                placeholder="value"
              />
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemove(k)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && inherited.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-1">No variables defined</p>
      )}

      {/* Add new */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-7 text-xs font-mono flex-1"
            placeholder="NEW_KEY"
          />
          <span className="text-muted-foreground text-xs">=</span>
          <Input
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-7 text-xs font-mono flex-1"
            placeholder="value"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleAdd}
            disabled={!newKey.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
