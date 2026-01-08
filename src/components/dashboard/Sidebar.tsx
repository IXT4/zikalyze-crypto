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
    navigate("/");
  };

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img 
            src={zikalyzeLogo} 
            alt="Loading" 
            className="h-16 w-16 animate-pulse"
          />
          <p className="text-sm text-muted-foreground">{t("sidebar.signingOut")}</p>
        </div>
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen h-[100dvh] w-16 flex-col items-center border-r border-border bg-card py-4 lg:w-64 lg:py-6 safe-area-inset-top">
      {/* Logo */}
      <Link to="/dashboard" className="mb-6 flex items-center gap-3 lg:mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary glow-purple lg:h-10 lg:w-10">
          <TrendingUp className="h-4 w-4 text-primary-foreground lg:h-5 lg:w-5" />
        </div>
        <span className="hidden text-lg font-bold text-foreground lg:block lg:text-xl">
          Zikalyze
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1.5 px-2 lg:gap-2 lg:px-3 custom-scrollbar overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-all lg:rounded-xl lg:px-3 lg:py-3",
                isActive
                  ? "bg-primary text-primary-foreground glow-cyan"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0 lg:h-5 lg:w-5" />
              <span className="hidden lg:block text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1.5 px-2 mt-2 mb-4 lg:gap-2 lg:px-3 pb-safe">
        <button className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 lg:rounded-xl lg:px-3 lg:py-3">
          <Search className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="hidden lg:block text-sm">{t("sidebar.search")}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-muted-foreground transition-all hover:bg-destructive/20 hover:text-destructive active:scale-95 lg:rounded-xl lg:px-3 lg:py-3"
        >
          <LogOut className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="hidden lg:block text-sm">{t("sidebar.logout")}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
