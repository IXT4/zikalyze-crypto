import { Brain } from "lucide-react";

export const ZikalyzeWatermark = () => {
  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm opacity-60 hover:opacity-100 transition-opacity">
      <Brain className="h-3 w-3 text-primary" />
      <span className="text-[10px] font-medium text-muted-foreground">
        Powered by <span className="text-primary">Zikalyze AI</span>
      </span>
    </div>
  );
};
