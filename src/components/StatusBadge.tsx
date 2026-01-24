import type { TestStatus, Priority } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Circle,
  Loader2
} from 'lucide-react';

const statusConfig: Record<TestStatus, { label: string; className: string; icon: React.ElementType }> = {
  passed: { 
    label: 'Passed', 
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
    icon: CheckCircle2
  },
  failed: { 
    label: 'Failed', 
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
    icon: XCircle
  },
  blocked: { 
    label: 'Blocked', 
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
    icon: AlertTriangle
  },
  not_run: { 
    label: 'Not Run', 
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    icon: Circle
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
    icon: Loader2
  },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  critical: { 
    label: 'Critical', 
    className: 'bg-destructive/10 text-destructive border-destructive/20'
  },
  high: { 
    label: 'High', 
    className: 'bg-warning/10 text-warning border-warning/20'
  },
  medium: { 
    label: 'Medium', 
    className: 'bg-primary/10 text-primary border-primary/20'
  },
  low: { 
    label: 'Low', 
    className: 'bg-muted text-muted-foreground border-border'
  },
};

interface StatusBadgeProps {
  status: TestStatus;
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge = ({ status, showIcon = true, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1.5 font-medium', config.className, className)}
    >
      {showIcon && <Icon className={cn('h-3 w-3', status === 'in_progress' && 'animate-spin')} />}
      {config.label}
    </Badge>
  );
};

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const config = priorityConfig[priority];
  
  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  );
};
