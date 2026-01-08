import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { useAuth } from "@/hooks/useAuth";
import zikalyzeLogo from "@/assets/zikalyze-logo.png";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: t("sidebar.dashboard"), path: "/dashboard" },
    { icon: BarChart3, label: t("sidebar.analytics"), path: "/dashboard/analytics" },
    { icon: Brain, label: t("sidebar.aiAnalyzer"), path: "/dashboard/analyzer" },
    { icon: BellRing, label: t("sidebar.alerts"), path: "/dashboard/alerts" },
    { icon: Wallet, label: t("sidebar.portfolio"), path: "/dashboard/portfolio" },
    { icon: Settings, label: t("sidebar.settings"), path: "/dashboard/settings" },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    
    setTimeout(() => {
      navigate("/");
    }, 800);
  };

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img 
            src={zikalyzeLogo} 
            alt="Loading" 
            className="h-12 w-12 animate-spin"
          />
          <p className="text-sm text-muted-foreground">{t("sidebar.signingOut")}</p>
        </div>
      </div>
    );
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
          <span className="hidden lg:block">{t("sidebar.search")}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-muted-foreground transition-all hover:bg-destructive/20 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="hidden lg:block">{t("sidebar.logout")}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
