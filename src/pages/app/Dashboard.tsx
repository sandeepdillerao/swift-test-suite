import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Circle,
  TestTube2,
  Play,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useTestRuns } from '@/hooks/useTestRuns';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: testRuns } = useTestRuns();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Test Cases', 
      value: stats?.totalTestCases || 0, 
      icon: TestTube2,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      title: 'Passed', 
      value: stats?.passedTests || 0, 
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    { 
      title: 'Failed', 
      value: stats?.failedTests || 0, 
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    { 
      title: 'Blocked', 
      value: stats?.blockedTests || 0, 
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your testing progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pass Rate & Active Runs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pass Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{stats?.passRate || 0}%</span>
              <span className="text-sm text-muted-foreground mb-1">overall</span>
            </div>
            <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${stats?.passRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Test Runs
            </CardTitle>
            <Play className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeTestRuns || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {testRuns?.filter(r => r.status === 'active').length || 0} in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {activity.type === 'test_executed' && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {activity.type === 'test_created' && <TestTube2 className="h-4 w-4 text-primary" />}
                  {activity.type === 'test_updated' && <Circle className="h-4 w-4 text-muted-foreground" />}
                  {activity.type === 'run_started' && <Play className="h-4 w-4 text-primary" />}
                  {activity.type === 'run_completed' && <CheckCircle2 className="h-4 w-4 text-success" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {activity.userName} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
