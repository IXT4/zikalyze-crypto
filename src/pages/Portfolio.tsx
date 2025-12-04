import { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
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

interface Holding {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  buyPrice: number;
  currentPrice: number;
}

const cryptoPrices: Record<string, { name: string; price: number; change: number }> = {
  BTC: { name: "Bitcoin", price: 42840.4, change: 2.5 },
  ETH: { name: "Ethereum", price: 2842, change: -1.46 },
  SOL: { name: "Solana", price: 127.18, change: 4.85 },
  XRP: { name: "Ripple", price: 2.05, change: -2.63 },
  DOGE: { name: "Dogecoin", price: 0.1376, change: 3.84 },
  BNB: { name: "BNB", price: 315.2, change: 1.2 },
  ADA: { name: "Cardano", price: 0.58, change: -0.8 },
  AVAX: { name: "Avalanche", price: 38.5, change: 5.2 },
};

const Portfolio = () => {
  const [holdings, setHoldings] = useState<Holding[]>([
    { id: "1", symbol: "BTC", name: "Bitcoin", amount: 0.5, buyPrice: 40000, currentPrice: 42840.4 },
    { id: "2", symbol: "ETH", name: "Ethereum", amount: 3, buyPrice: 2500, currentPrice: 2842 },
    { id: "3", symbol: "SOL", name: "Solana", amount: 25, buyPrice: 100, currentPrice: 127.18 },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: "",
    amount: "",
    buyPrice: "",
  });

  const totalValue = holdings.reduce(
    (sum, h) => sum + h.amount * h.currentPrice,
    0
  );

  const totalCost = holdings.reduce(
    (sum, h) => sum + h.amount * h.buyPrice,
    0
  );

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? ((totalPnL / totalCost) * 100) : 0;

  const addHolding = () => {
    if (!newHolding.symbol || !newHolding.amount || !newHolding.buyPrice) return;

    const crypto = cryptoPrices[newHolding.symbol];
    if (!crypto) return;

    const holding: Holding = {
      id: Date.now().toString(),
      symbol: newHolding.symbol,
      name: crypto.name,
      amount: parseFloat(newHolding.amount),
      buyPrice: parseFloat(newHolding.buyPrice),
      currentPrice: crypto.price,
    };

    setHoldings([...holdings, holding]);
    setNewHolding({ symbol: "", amount: "", buyPrice: "" });
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
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New Holding</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Select
                  value={newHolding.symbol}
                  onValueChange={(value) =>
                    setNewHolding({ ...newHolding, symbol: value })
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select crypto" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(cryptoPrices).map(([symbol, data]) => (
                      <SelectItem key={symbol} value={symbol}>
                        {data.name} ({symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={newHolding.amount}
                  onChange={(e) =>
                    setNewHolding({ ...newHolding, amount: e.target.value })
                  }
                  className="bg-secondary border-border"
                />
                <Input
                  type="number"
                  placeholder="Buy Price (USD)"
                  value={newHolding.buyPrice}
                  onChange={(e) =>
                    setNewHolding({ ...newHolding, buyPrice: e.target.value })
                  }
                  className="bg-secondary border-border"
                />
                <Button onClick={addHolding} className="w-full">
                  Add to Portfolio
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Value
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
                  Total Cost
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
                  Total P&L
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
              <CardTitle className="text-foreground">Your Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Asset</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Buy Price</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Current Price</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Value</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">P&L</th>
                      <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => {
                      const value = holding.amount * holding.currentPrice;
                      const cost = holding.amount * holding.buyPrice;
                      const pnl = value - cost;
                      const pnlPercent = ((pnl / cost) * 100);

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
                          <td className="py-4 text-right text-foreground">${holding.currentPrice.toLocaleString()}</td>
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
                    No holdings yet. Add your first crypto holding to get started.
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
