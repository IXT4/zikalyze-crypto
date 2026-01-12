import { useMemo } from "react";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

const MiniSparkline = ({ data, width = 48, height = 20, className = "" }: MiniSparklineProps) => {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M${points.join(" L")}`;
  }, [data, width, height]);
  
  const isPositive = data.length >= 2 ? data[data.length - 1] >= data[0] : true;
  const strokeColor = isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";
  
  if (data.length < 2) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="h-0.5 w-full bg-muted-foreground/20 rounded" />
      </div>
    );
  }
  
  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default MiniSparkline;
