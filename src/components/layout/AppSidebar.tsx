export function AppSidebar() {
  const { user, logout, isAdmin, isMasterTI, isSystemOwner } = useAuth();
  const { branding } = useBranding();
  const { data: features } = useTenantFeatures();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const renderMenuLink = (item: { title: string; url: string; icon: React.ElementType }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild>
        <NavLink 
          to={item.url}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
            isActive(item.url) 
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );