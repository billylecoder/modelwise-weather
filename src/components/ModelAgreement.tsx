import { useMemo } from "react";
import { ModelForecast, WeatherParam } from "@/data/weatherApi";

interface ModelConfidenceProps {
  models: ModelForecast[];
  parameter: WeatherParam;
  enabledModels: string[];
  forecastHour: number;
}

const ModelConfidence = ({ models, parameter, enabledModels, forecastHour }: ModelConfidenceProps) => {
  const { level, values } = useMemo(() => {
    const active = models.filter((m) => enabledModels.includes(m.model));
    if (active.length === 0) return { level: "high" as const, values: [] };

    const vals = active.map((m) => {
      // Find closest hour index instead of exact match
      let hourIndex = m.hours.indexOf(forecastHour);
      if (hourIndex === -1) {
        // Find nearest hour
        hourIndex = 0;
        let minDiff = Math.abs(m.hours[0] - forecastHour);
        for (let i = 1; i < m.hours.length; i++) {
          const diff = Math.abs(m.hours[i] - forecastHour);
          if (diff < minDiff) { minDiff = diff; hourIndex = i; }
        }
      }
      return { model: m.model, value: m[parameter][hourIndex] ?? 0, color: m.color };
    });

    const numbers = vals.map((v) => v.value);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const spread = max - min;
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;

    let level: "high" | "medium" | "low" = "high";
    const relSpread = avg !== 0 ? spread / Math.abs(avg) : 0;
    if (relSpread > 0.3) level = "low";
    else if (relSpread > 0.1) level = "medium";

    return { level, values: vals };
  }, [models, parameter, enabledModels, forecastHour]);

  const config = {
    high: { label: "High Confidence", color: "text-confidence-high", bg: "bg-confidence-high/10", barWidth: "w-full" },
    medium: { label: "Moderate Confidence", color: "text-confidence-medium", bg: "bg-confidence-medium/10", barWidth: "w-2/3" },
    low: { label: "Low Confidence", color: "text-confidence-low", bg: "bg-confidence-low/10", barWidth: "w-1/3" },
  };

  const { label, color, bg, barWidth } = config[level];

  return (
    <div className={`rounded-xl p-4 ${bg} border border-border/30`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`font-heading font-semibold text-sm ${color}`}>{label}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted/30 mb-3">
        <div className={`h-full rounded-full ${barWidth} ${level === "high" ? "bg-confidence-high" : level === "medium" ? "bg-confidence-medium" : "bg-confidence-low"} transition-all`} />
      </div>
      <div className="flex gap-2">
        {values.map((v) => (
          <div key={v.model} className="flex-1 text-center">
            <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: v.color }} />
            <div className="text-xs text-muted-foreground font-body">{v.model}</div>
            <div className="text-sm font-heading font-semibold">{v.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelConfidence;
