import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Holding {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  buyPrice: number;
  coinId: string;
}

const STORAGE_KEY = "zikalyze_portfolio_holdings";

const Portfolio = () => {
  const { prices, loading, getPriceBySymbol, getPriceById, refetch } = useCryptoPrices();
  const { t } = useTranslation();
  
  // Load holdings from localStorage on mount
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newHolding, setNewHolding] = useState({
    coinId: "",
    amount: "",
    buyPrice: "",
  });

  // Save holdings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  const getCurrentPrice = (coinId: string): number => {
    return getPriceById(coinId)?.current_price || 0;
  };

  const getPriceChange = (coinId: string): number => {
    return getPriceById(coinId)?.price_change_percentage_24h || 0;
  };

  const totalValue = holdings.reduce(
    (sum, h) => sum + h.amount * getCurrentPrice(h.coinId),
    0
  );

  const totalCost = holdings.reduce(
    (sum, h) => sum + h.amount * h.buyPrice,
    0
  );

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? ((totalPnL / totalCost) * 100) : 0;

  const addHolding = () => {
    if (!newHolding.coinId || !newHolding.amount || !newHolding.buyPrice) return;

    const crypto = prices.find(c => c.id === newHolding.coinId);
    if (!crypto) return;

    const holding: Holding = {
      id: Date.now().toString(),
      symbol: crypto.symbol.toUpperCase(),
      name: crypto.name,
      coinId: crypto.id,
      amount: parseFloat(newHolding.amount),
      buyPrice: parseFloat(newHolding.buyPrice),
    };

    setHoldings([...holdings, holding]);
    setNewHolding({ coinId: "", amount: "", buyPrice: "" });
    setIsDialogOpen(false);
  };

  const removeHolding = (id: string) => {
    setHoldings(holdings.filter((h) => h.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-16 lg:ml-64">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">{t("portfolio.title")}</h1>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${loading ? "bg-warning" : "bg-success"} animate-pulse`} />
              <span className="text-xs text-muted-foreground">{loading ? t("portfolio.updating") : t("portfolio.livePrices")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("portfolio.addHolding")}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{t("portfolio.addNewHolding")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select
                    value={newHolding.coinId}
                    onValueChange={(value) =>
                      setNewHolding({ ...newHolding, coinId: value })
                    }
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder={t("portfolio.selectCrypto")} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-[300px]">
                      <ScrollArea className="h-[250px]">
                        {prices.map((crypto) => (
                          <SelectItem key={crypto.id} value={crypto.id}>
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{crypto.symbol.toUpperCase()}</span>
                              <span className="text-muted-foreground text-sm">{crypto.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder={t("portfolio.amount")}
                    value={newHolding.amount}
                    onChange={(e) =>
                      setNewHolding({ ...newHolding, amount: e.target.value })
                    }
                    className="bg-secondary border-border"
                  />
                  <Input
                    type="number"
                    placeholder={t("portfolio.buyPrice")}
                    value={newHolding.buyPrice}
                    onChange={(e) =>
                      setNewHolding({ ...newHolding, buyPrice: e.target.value })
                    }
                    className="bg-secondary border-border"
                  />
                  <Button onClick={addHolding} className="w-full">
                    {t("portfolio.addToPortfolio")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("portfolio.totalValue")}
                </CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("portfolio.totalCost")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("portfolio.totalPnL")}
                </CardTitle>
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
                  {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="ml-2 text-sm">
                    ({totalPnLPercent >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Holdings Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">{t("portfolio.yourHoldings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left text-sm font-medium text-muted-foreground">{t("portfolio.asset")}</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">{t("portfolio.amount")}</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">{t("portfolio.buyPrice")}</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">{t("portfolio.currentPrice")}</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">{t("portfolio.value")}</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">{t("portfolio.pnl")}</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">{t("portfolio.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => {
                      const currentPrice = getCurrentPrice(holding.coinId);
                      const value = holding.amount * currentPrice;
                      const cost = holding.amount * holding.buyPrice;
                      const pnl = value - cost;
                      const pnlPercent = cost > 0 ? ((pnl / cost) * 100) : 0;
                      const priceChange = getPriceChange(holding.coinId);

                      return (
                        <tr key={holding.id} className="border-b border-border/50">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                                {holding.symbol.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{holding.name}</div>
                                <div className="text-sm text-muted-foreground">{holding.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right text-foreground">{holding.amount}</td>
                          <td className="py-4 text-right text-muted-foreground">${holding.buyPrice.toLocaleString()}</td>
                          <td className="py-4 text-right">
                            <div className="text-foreground">${currentPrice.toLocaleString()}</div>
                            <div className={`text-xs ${priceChange >= 0 ? "text-success" : "text-destructive"}`}>
                              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                            </div>
                          </td>
                          <td className="py-4 text-right font-medium text-foreground">
                            ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 text-right font-medium ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="ml-1 text-xs">
                              ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeHolding(holding.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {holdings.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    {t("portfolio.noHoldings")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Portfolio;
