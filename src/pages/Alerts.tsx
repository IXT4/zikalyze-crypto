import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import { Search, User, Bell, BellRing, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState as useStateReact } from "react";
import { cn } from "@/lib/utils";

interface TriggeredAlert {
  id: string;
  symbol: string;
  name: string;
  target_price: number;
  condition: "above" | "below";
  triggered_at: string;
  current_price_at_creation: number;
}

const Alerts = () => {
  const { alerts, loading, removeAlert } = usePriceAlerts();
  const { prices, getPriceBySymbol } = useCryptoPrices();
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch triggered alerts history
  useEffect(() => {
    const fetchTriggeredAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from("price_alerts")
          .select("*")
          .eq("is_triggered", true)
          .order("triggered_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching triggered alerts:", error);
          return;
        }

        const typedData = (data || []).map((item) => ({
          ...item,
          condition: item.condition as "above" | "below",
        }));
        setTriggeredAlerts(typedData);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchTriggeredAlerts();
  }, []);

  const handleRemoveAlert = async (alertId: string) => {
    await removeAlert(alertId);
  };

  const handleClearHistory = async () => {
    try {
      const { error } = await supabase
        .from("price_alerts")
        .delete()
        .eq("is_triggered", true);

      if (error) {
        console.error("Error clearing history:", error);
        return;
      }

      setTriggeredAlerts([]);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-16 lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Price Alerts</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search alerts"
                className="w-64 bg-secondary border-border pl-10"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Active Alerts</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{alerts.length}</div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Triggered Today</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {triggeredAlerts.filter(a => {
                  const today = new Date();
                  const triggerDate = new Date(a.triggered_at);
                  return triggerDate.toDateString() === today.toDateString();
                }).length}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-chart-cyan/20">
                  <Clock className="h-5 w-5 text-chart-cyan" />
                </div>
                <span className="text-sm text-muted-foreground">Total Triggered</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{triggeredAlerts.length}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("active")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-2",
                activeTab === "active"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="h-4 w-4" />
              Active Alerts
              {alerts.length > 0 && (
                <span className="bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded text-xs">
                  {alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-2",
                activeTab === "history"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="h-4 w-4" />
              Alert History
            </button>
          </div>

          {/* Content */}
          <div className="rounded-2xl border border-border bg-card">
            {activeTab === "active" ? (
              <>
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Active Price Alerts</h3>
                  <span className="text-sm text-muted-foreground">
                    Monitoring {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {loading ? (
                  <div className="p-12 flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-foreground mb-2">No Active Alerts</h4>
                    <p className="text-sm text-muted-foreground">
                      Set price alerts from the Dashboard to get notified when prices hit your targets.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {alerts.map((alert) => {
                      const crypto = getPriceBySymbol(alert.symbol);
                      const currentPrice = crypto?.current_price || 0;
                      const progressPercent = alert.condition === "above"
                        ? Math.min(100, (currentPrice / alert.target_price) * 100)
                        : Math.min(100, (alert.target_price / currentPrice) * 100);
                      const distancePercent = alert.condition === "above"
                        ? ((alert.target_price - currentPrice) / currentPrice) * 100
                        : ((currentPrice - alert.target_price) / currentPrice) * 100;

                      return (
                        <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center gap-4">
                            {crypto?.image && (
                              <img src={crypto.image} alt={alert.name} className="w-10 h-10 rounded-full" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{alert.symbol}</span>
                                <span className="text-sm text-muted-foreground">{alert.name}</span>
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium",
                                  alert.condition === "above" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                                )}>
                                  {alert.condition === "above" ? "↑ Above" : "↓ Below"}
                                </span>
                                <span>${alert.target_price.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Current Price</div>
                              <div className="font-semibold text-foreground">${currentPrice.toLocaleString()}</div>
                            </div>
                            <div className="text-right w-20">
                              <div className="text-sm text-muted-foreground">Distance</div>
                              <div className={cn(
                                "font-semibold",
                                distancePercent > 0 ? "text-warning" : "text-success"
                              )}>
                                {distancePercent > 0 ? `${distancePercent.toFixed(1)}%` : "Ready!"}
                              </div>
                            </div>
                            <div className="w-32 hidden md:block">
                              <div className="text-xs text-muted-foreground mb-1">Progress</div>
                              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-500 rounded-full"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveAlert(alert.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Triggered Alert History</h3>
                  {triggeredAlerts.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearHistory}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear History
                    </Button>
                  )}
                </div>

                {historyLoading ? (
                  <div className="p-12 flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : triggeredAlerts.length === 0 ? (
                  <div className="p-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-foreground mb-2">No Alert History</h4>
                    <p className="text-sm text-muted-foreground">
                      Triggered alerts will appear here once your price targets are hit.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {triggeredAlerts.map((alert) => (
                      <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-success/20">
                            <CheckCircle className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{alert.symbol}</span>
                              <span className="text-sm text-muted-foreground">{alert.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                alert.condition === "above" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                              )}>
                                {alert.condition === "above" ? "↑ Above" : "↓ Below"}
                              </span>
                              <span>${alert.target_price.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Set At</div>
                            <div className="text-sm text-foreground">${alert.current_price_at_creation.toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Triggered</div>
                            <div className="text-sm text-foreground">{formatDate(alert.triggered_at)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Alerts;