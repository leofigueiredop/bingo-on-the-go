import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  SidebarProvider, 
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';
import { 
  Home, 
  User, 
  CreditCard, 
  History, 
  Settings, 
  LogOut, 
  Sparkles,
  Shield,
  Users,
  DollarSign,
  Menu,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavItem {
  title: string;
  icon: any;
  url: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Início', icon: Home, url: '/' },
  { title: 'Perfil', icon: User, url: '/profile' },
  { title: 'Depósitos', icon: CreditCard, url: '/deposits' },
  { title: 'Histórico', icon: History, url: '/history' },
  { title: 'Configurações', icon: Settings, url: '/settings' },
];

const adminItems: NavItem[] = [
  { title: 'Admin Panel', icon: Shield, url: '/admin', adminOnly: true },
  { title: 'Usuários', icon: Users, url: '/admin/users', adminOnly: true },
  { title: 'Financeiro', icon: DollarSign, url: '/admin/finance', adminOnly: true },
];

function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, toggleDark } = useTheme();
  const { largeText, toggleLargeText } = useAccessibility();
  
  // Check if user is admin (you can implement this logic based on your user roles)
  const isAdmin = user?.email?.includes('admin'); // Simple check, replace with proper role check

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={cn(state === "collapsed" ? "w-14" : "w-64")} collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          {state !== "collapsed" && (
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              BingoMax
            </span>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={cn(
                      "w-full justify-start",
                      isActive(item.url) && "bg-primary text-primary-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {state !== "collapsed" && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/rooms')}
                  className={cn(
                    "w-full justify-start",
                    isActive('/rooms') && "bg-primary text-primary-foreground"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  {state !== "collapsed" && <span>Salas</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      className={cn(
                        "w-full justify-start",
                        isActive(item.url) && "bg-primary text-primary-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-start" onClick={toggleDark}>
                  <span className="h-4 w-4">🌓</span>
                  {state !== "collapsed" && <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-start" onClick={toggleLargeText}>
                  <span className="h-4 w-4">🔎</span>
                  {state !== "collapsed" && <span>{largeText ? 'Fonte Normal' : 'Fonte Grande'}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-start" onClick={() => setTheme('feminine')}>
                  <span className="h-4 w-4">💖</span>
                  {state !== "collapsed" && <span>Tema Feminino</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} className="w-full justify-start text-destructive">
                  <LogOut className="h-4 w-4" />
                  {state !== "collapsed" && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const Layout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleHeaderSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger />
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{(user?.email || 'U').slice(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {user?.email || 'Usuário'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/deposits')}>
                    Depósitos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleHeaderSignOut}>
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-24 md:pb-0">
            <Outlet />
          </main>
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
            <div className="relative mx-auto max-w-[640px]">
              <div className="grid grid-cols-3 items-end">
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="py-3 flex flex-col items-center justify-center w-full">
                      <Menu className="h-7 w-7 md:h-6 md:w-6" />
                      <span className="mt-1 text-sm md:text-xs font-semibold">Mais</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] p-4">
                    <div className="grid gap-3">
                      <Button className="w-full h-12 text-base" onClick={() => navigate('/')}><Home className="h-5 w-5 mr-2"/> Início</Button>
                      <Button className="w-full h-12 text-base" onClick={() => navigate('/rooms')}><LayoutGrid className="h-5 w-5 mr-2"/> Salas</Button>
                      <Button className="w-full h-12 text-base" onClick={() => navigate('/profile')}><User className="h-5 w-5 mr-2"/> Perfil</Button>
                      <Button className="w-full h-12 text-base" variant="secondary" onClick={() => navigate('/settings')}><Settings className="h-5 w-5 mr-2"/> Configurações</Button>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Button variant="outline" onClick={() => document.documentElement.classList.toggle('dark')}>Tema</Button>
                        <Button variant="outline" onClick={() => document.documentElement.classList.toggle('theme-feminine')}>Feminino</Button>
                        <Button variant="outline" onClick={() => document.documentElement.classList.toggle('senior')}>Texto</Button>
                      </div>
                      <Button className="w-full h-12" variant="destructive" onClick={async ()=>{await signOut(); navigate('/auth')}}><LogOut className="h-5 w-5 mr-2"/> Sair</Button>
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="flex items-center justify-center">
                  <Button size="lg" className="h-14 px-8 rounded-none text-base font-extrabold btn-gold animate-gold-sheen animate-gold-glow sheen-diagonal w-full mx-2" onClick={() => navigate('/deposits')}>
                    <DollarSign className="h-7 w-7 mr-2"/> Depositar
                  </Button>
                </div>
                <button className="py-3 flex flex-col items-center justify-center w-full" onClick={() => navigate('/rooms')}>
                  <LayoutGrid className="h-7 w-7 md:h-6 md:w-6" />
                  <span className="mt-1 text-sm md:text-xs font-semibold">Salas</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;