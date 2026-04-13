import { useMemo } from "react";
import { ModelForecast, WeatherParam } from "@/data/mockWeatherData";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface ModelAgreementProps {
  models: ModelForecast[];
  parameter: WeatherParam;
  enabledModels: string[];
  forecastHour: number;
}

const ModelAgreement = ({ models, parameter, enabledModels, forecastHour }: ModelAgreementProps) => {
  const { level, spread, values } = useMemo(() => {
    const active = models.filter((m) => enabledModels.includes(m.model));
    const hourIndex = active[0]?.hours.indexOf(forecastHour) ?? 0;
    const vals = active.map((m) => ({ model: m.model, value: m[parameter][hourIndex], color: m.color }));

    const numbers = vals.map((v) => v.value);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const spread = max - min;
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;

    let level: "high" | "medium" | "low" = "high";
    const relSpread = avg !== 0 ? spread / Math.abs(avg) : 0;
    if (relSpread > 0.3) level = "low";
    else if (relSpread > 0.1) level = "medium";

    return { level, spread: spread.toFixed(1), values: vals };
  }, [models, parameter, enabledModels, forecastHour]);

  const config = {
    high: { icon: ShieldCheck, label: "High Agreement", color: "text-confidence-high", bg: "bg-confidence-high/10" },
    medium: { icon: ShieldQuestion, label: "Moderate Spread", color: "text-confidence-medium", bg: "bg-confidence-medium/10" },
    low: { icon: ShieldAlert, label: "Low Agreement", color: "text-confidence-low", bg: "bg-confidence-low/10" },
  };

  const { icon: Icon, label, color, bg } = config[level];

  return (
    <div className={`rounded-xl p-4 ${bg} border border-border/30`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className={`font-heading font-semibold text-sm ${color}`}>{label}</span>
        <span className="text-xs text-muted-foreground ml-auto">Spread: {spread}</span>
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

export default ModelAgreement;
