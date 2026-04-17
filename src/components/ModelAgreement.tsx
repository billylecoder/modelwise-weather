import { useMemo } from "react";
import { ModelForecast, WeatherParam } from "@/data/weatherApi";
import { useI18n } from "@/i18n";

interface ModelConfidenceProps {
  models: ModelForecast[];
  parameter: WeatherParam;
  enabledModels: string[];
  forecastHour: number;
}

const ModelConfidence = ({ models, parameter, enabledModels, forecastHour }: ModelConfidenceProps) => {
  const { t } = useI18n();
  const { units } = useUnits();

  const { level, values } = useMemo(() => {
    const active = models.filter((m) => enabledModels.includes(m.model));
    if (active.length === 0) return { level: "high" as const, values: [] };

    const vals = active.map((m) => {
      let hourIndex = m.hours.indexOf(forecastHour);
      if (hourIndex === -1) {
        hourIndex = 0;
        let minDiff = Math.abs(m.hours[0] - forecastHour);
        for (let i = 1; i < m.hours.length; i++) {
          const diff = Math.abs(m.hours[i] - forecastHour);
          if (diff < minDiff) { minDiff = diff; hourIndex = i; }
        }
      }
      const raw = m[parameter][hourIndex];
      const converted = convertValue(raw as number | null | undefined, parameter, units);
      return { model: m.model, value: converted, color: m.color };
    });

    // Only include non-null values in spread/confidence calculation
    const validNumbers = vals.filter((v) => v.value !== null && v.value !== undefined).map((v) => v.value as number);

    let level: "high" | "medium" | "low" = "high";
    if (validNumbers.length >= 2) {
      const min = Math.min(...validNumbers);
      const max = Math.max(...validNumbers);
      const spread = max - min;
      const avg = validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length;
      const relSpread = avg !== 0 ? spread / Math.abs(avg) : 0;
      if (relSpread > 0.3) level = "low";
      else if (relSpread > 0.1) level = "medium";
    }

    return { level, values: vals };
  }, [models, parameter, enabledModels, forecastHour, units]);

  const config = {
    high: { label: t("highConfidence"), color: "text-confidence-high", bg: "bg-confidence-high/10", barWidth: "w-full" },
    medium: { label: t("moderateConfidence"), color: "text-confidence-medium", bg: "bg-confidence-medium/10", barWidth: "w-2/3" },
    low: { label: t("lowConfidence"), color: "text-confidence-low", bg: "bg-confidence-low/10", barWidth: "w-1/3" },
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
            <div className="text-sm font-heading font-semibold">
              {v.value !== null && v.value !== undefined ? smartRound(v.value, parameter, units) : "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelConfidence;
