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
    <aside className="w-64 glass h-full flex flex-col border-r border-white/10 z-10">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="bg-primary/20 p-2 rounded-lg text-primary">
          <ShieldAlert size={24} />
        </div>
        <h1 className="font-bold text-lg tracking-tight">SafeGuard AI</h1>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => setToken(null)}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
