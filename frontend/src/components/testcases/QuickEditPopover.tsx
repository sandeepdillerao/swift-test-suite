import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestStatus, Priority } from '@/types';

const statusOptions: { value: TestStatus; label: string; color: string }[] = [
  { value: 'passed', label: 'Passed', color: 'bg-success text-success-foreground' },
  { value: 'failed', label: 'Failed', color: 'bg-destructive text-destructive-foreground' },
  { value: 'blocked', label: 'Blocked', color: 'bg-warning text-warning-foreground' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-primary text-primary-foreground' },
  { value: 'not_run', label: 'Not Run', color: 'bg-muted text-muted-foreground' },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-destructive text-destructive-foreground' },
  { value: 'high', label: 'High', color: 'bg-warning text-warning-foreground' },
  { value: 'medium', label: 'Medium', color: 'bg-primary text-primary-foreground' },
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
];

interface QuickEditStatusProps {
  currentValue: TestStatus;
  onSelect: (value: TestStatus) => void;
  children: React.ReactNode;
}

export const QuickEditStatus = ({ currentValue, onSelect, children }: QuickEditStatusProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        <div className="space-y-1">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start text-xs',
                currentValue === option.value && 'bg-muted'
              )}
              onClick={() => onSelect(option.value)}
            >
              <span className={cn('w-2 h-2 rounded-full mr-2', option.color)} />
              {option.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface QuickEditPriorityProps {
  currentValue: Priority;
  onSelect: (value: Priority) => void;
  children: React.ReactNode;
}

export const QuickEditPriority = ({ currentValue, onSelect, children }: QuickEditPriorityProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="start">
        <div className="space-y-1">
          {priorityOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start text-xs',
                currentValue === option.value && 'bg-muted'
              )}
              onClick={() => onSelect(option.value)}
            >
              <span className={cn('w-2 h-2 rounded-full mr-2', option.color)} />
              {option.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
