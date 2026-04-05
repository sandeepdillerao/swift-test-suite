import { useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TestTube2,
  FolderTree,
  FolderKanban,
  Play,
  Settings,
  Menu,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  FlaskConical,
  Link2,
  Users,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useProjects } from '@/hooks/useProjects';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard, permission: 'dashboard:read' },
  { name: 'Projects', href: '/app/projects', icon: FolderKanban, permission: 'projects:read' },
  { name: 'Test Cases', href: '/app/test-cases', icon: TestTube2, permission: 'test_cases:read' },
  { name: 'Test Suites', href: '/app/test-suites', icon: FolderTree, permission: 'test_suites:read' },
  { name: 'Test Runs', href: '/app/test-runs', icon: Play, permission: 'test_runs:read' },
  { name: 'Releases', href: '/app/releases', icon: Tag, permission: 'releases:read' },
  { name: 'Integrations', href: '/app/integrations', icon: Link2, permission: 'integrations:read' },
  { name: 'Users', href: '/app/users', icon: Users, permission: 'users:read' },
  { name: 'Roles & Permissions', href: '/app/roles', icon: Shield, permission: 'roles:read' },
  { name: 'Settings', href: '/app/settings', icon: Settings, permission: 'settings:read' },
];

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, refreshToken, logout } = useAuthStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const { data: projects = [] } = useProjects();
  const { can, loaded: permsLoaded } = usePermissions();

  // Filter nav items based on user's permissions.
  // While loading, show nothing to prevent unauthorized items flashing.
  const visibleNav = permsLoaded
    ? navigation.filter((item) => can(item.permission))
    : [];

  // Auto-select first active project when none is persisted or the persisted one was deleted
  useEffect(() => {
    if (projects.length === 0) return;
    const activeProjects = projects.filter((p) => !p.isArchived);
    if (!currentProject) {
      setCurrentProject(activeProjects[0] ?? projects[0]);
    } else {
      // Re-sync: replace with fresh data in case name/key changed
      const fresh = projects.find((p) => p.id === currentProject.id);
      if (!fresh) {
        // Previously selected project was deleted — fall back to first
        setCurrentProject(activeProjects[0] ?? projects[0]);
      } else if (fresh !== currentProject) {
        setCurrentProject(fresh);
      }
    }
  }, [projects]);

  const handleLogout = async () => {
    try {
      if (refreshToken) await api.auth.logout(refreshToken);
    } catch {
      // proceed with local logout even if API call fails
    } finally {
      logout();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    }
  };

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FlaskConical className="h-4 w-4 text-primary-foreground" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-lg">TestFlow</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 mt-2 pb-16">
          {!permsLoaded ? (
            // Skeleton placeholders while permissions are loading
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5', sidebarCollapsed && 'justify-center px-2')}>
                <div className="h-5 w-5 rounded bg-muted animate-pulse flex-shrink-0" />
                {!sidebarCollapsed && <div className="h-4 w-24 rounded bg-muted animate-pulse" />}
              </div>
            ))
          ) : (
            visibleNav.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/app' && location.pathname.startsWith(item.href));

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </NavLink>
              );
            })
          )}
        </nav>

        {/* Current Project Indicator */}
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-border">
          {!sidebarCollapsed ? (
            <NavLink to="/app/projects" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors group">
              <div className={cn('h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0', currentProject ? 'bg-primary' : 'bg-muted-foreground/30')}>
                {currentProject ? currentProject.key.slice(0, 2) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{currentProject?.name ?? 'No project selected'}</p>
                <p className="text-xs text-muted-foreground">{currentProject ? currentProject.key : 'Click to select'}</p>
              </div>
            </NavLink>
          ) : (
            <NavLink to="/app/projects" className="flex justify-center py-2">
              <div className={cn('h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold', currentProject ? 'bg-primary' : 'bg-muted-foreground/30')}>
                {currentProject ? currentProject.key.slice(0, 2) : '?'}
              </div>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-xl px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search test cases..."
                className="pl-9 bg-muted/50 border-0"
              />
            </div>
          </div>

          {/* Project selector */}
          <div className="w-64">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="truncate">
                    {currentProject?.name || 'Select project'}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                {projects.length === 0 && (
                  <DropdownMenuItem disabled>No projects available</DropdownMenuItem>
                )}
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => setCurrentProject(project)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {project.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline-block">
                    {user?.displayName || 'User'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
