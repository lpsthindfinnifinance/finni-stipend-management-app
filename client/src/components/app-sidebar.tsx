import {
  Home,
  Briefcase,
  FileText,
  ClipboardCheck,
  Settings,
  LogOut,
  Calendar,
  ArrowRightLeft,
  TrendingDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const { user, role } = useAuth();
  const [location] = useLocation();
  const { state } = useSidebar();

  const mainItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
      roles: ["PSM", "Lead PSM", "Finance", "Admin"],
    },
    {
      title: "Practices",
      url: "/practices",
      icon: Briefcase,
      roles: ["PSM", "Lead PSM", "Finance", "Admin"],
    },
    {
      title: "Submit Request",
      url: "/requests/new",
      icon: FileText,
      roles: ["PSM", "Finance", "Admin"],
    },
    {
      title: "My Requests",
      url: "/requests",
      icon: FileText,
      roles: ["PSM", "Finance", "Admin"],
    },
    {
      title: "Approvals",
      url: "/approvals",
      icon: ClipboardCheck,
      roles: ["PSM", "Lead PSM", "Finance", "Admin"],
    },
    {
      title: "Allocations",
      url: "/allocations",
      icon: ArrowRightLeft,
      roles: ["PSM", "Lead PSM", "Finance", "Admin"],
    },
    {
      title: "Negative Earnings",
      url: "/negative-earnings",
      icon: TrendingDown,
      roles: ["PSM", "Lead PSM", "Finance", "Admin"],
    },
  ];

  const filteredItems = mainItems.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  return (
    <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          {state === "expanded" && (
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-sidebar-foreground">
                Finni Health
              </h2>
              <p className="text-xs text-muted-foreground">Stipend Management</p>
            </div>
          )}
        </SidebarHeader>
        <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    tooltip={item.title}
                  >
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {state === "expanded" && <span className="truncate">{item.title}</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

{(role === "Finance" || role === "Admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide px-3">
              System
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/finance-ops"}
                    data-testid="nav-finance-ops"
                    tooltip="Finance Ops"
                  >
                    <a href="/finance-ops" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      {state === "expanded" && <span className="truncate">Finance Ops</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/settings"}
                    data-testid="nav-settings"
                    tooltip="Settings"
                  >
                    <a href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4 shrink-0" />
                      {state === "expanded" && <span className="truncate">Settings</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        {state === "collapsed" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                data-testid="button-user-menu-collapsed"
              >
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = "/api/logout";
                }}
                data-testid="menu-item-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {user?.firstName?.[0] || user?.email?.[0] || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"}
                </p>
                <Badge variant="secondary" className="text-xs mt-1">
                  {role}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                window.location.href = "/api/logout";
              }}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
