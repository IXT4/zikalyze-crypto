import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  LayoutDashboard,
  BarChart3,
  Brain,
  Wallet,
  Settings,
  Search,
  LogOut,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ZikalyzeSplash from "@/components/ZikalyzeSplash";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Brain, label: "AI Analyzer", path: "/dashboard/analyzer" },
  { icon: BellRing, label: "Alerts", path: "/dashboard/alerts" },
  { icon: Wallet, label: "Portfolio", path: "/dashboard/portfolio" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    
    setTimeout(() => {
      navigate("/");
    }, 800);
  };

  if (isLoggingOut) {
    return <ZikalyzeSplash message="Signing out..." />;
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center border-r border-border bg-card py-6 lg:w-64">
      {/* Logo */}
      <Link to="/dashboard" className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow-purple">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="hidden text-xl font-bold text-foreground lg:block">
          Zikalyze
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-2 px-3">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2 px-3">
        <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
          <Search className="h-5 w-5" />
          <span className="hidden lg:block">Search</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-muted-foreground transition-all hover:bg-destructive/20 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="hidden lg:block">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
