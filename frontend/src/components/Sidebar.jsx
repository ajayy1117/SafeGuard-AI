import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Camera, LogOut, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar({ setToken }) {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/live', label: 'Live Feed', icon: Camera },
  ];

  return (
    <aside className="fixed bottom-0 left-0 w-full md:relative md:w-64 glass h-16 md:h-full flex flex-row md:flex-col border-t md:border-t-0 md:border-r border-white/10 z-50">
      <div className="hidden md:flex p-6 items-center gap-3 border-b border-white/5">
        <div className="bg-primary/20 p-2 rounded-lg text-primary">
          <ShieldAlert size={24} />
        </div>
        <h1 className="font-bold text-lg tracking-tight">SafeGuard AI</h1>
      </div>

      <nav className="flex-1 flex flex-row md:flex-col justify-around md:justify-start py-0 md:py-6 px-2 md:px-4 md:space-y-2 items-center md:items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-300 w-full',
                isActive 
                  ? 'text-primary md:bg-primary md:text-primary-foreground md:shadow-lg md:shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <Icon size={20} className={isActive ? "text-primary md:text-white" : ""} />
              <span className="text-[10px] md:text-base font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex md:block p-2 md:p-4 md:border-t md:border-white/5 justify-center">
        <button
          onClick={() => setToken(null)}
          className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:px-4 md:py-3 w-full text-center md:text-left text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="text-[10px] md:text-base font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
