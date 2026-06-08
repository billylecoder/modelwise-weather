import { useState } from "react";
import { ModelForecast, parameterConfig, WeatherParam } from "@/data/weatherApi";
import { Thermometer, CloudRain, Snowflake, Wind, Gauge, Droplets, Zap, Cloud, Sun, Compass, Activity } from "lucide-react";
import { useI18n, paramTranslationKey } from "@/i18n";
import { useUnits } from "@/contexts/UnitsContext";
import { formatValue, getUnitLabel } from "@/lib/units";
import { degToCardinal } from "@/lib/wind";

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Thermometer, CloudRain, Wind, Gauge, Droplets, Zap, Cloud, Snowflake, Sun, Compass, Activity,
};

const BASIC_PARAMS: WeatherParam[] = [
  "temperature", "apparentTemperature", "precipitation", "windSpeed", "humidity", "cloudCover", "snowfall", "windDirection",
];
// Rain Total + Snow Depth placed side-by-side (positions 0 & 1 in a 4-col grid).
const ADVANCED_PARAMS: WeatherParam[] = [
  "precipitationTotal", "snowDepth", "windGusts", "pressure", "dewPoint", "temp850hPa", "temp500hPa", "freezingLevel",
];
const SEVERE_PARAMS: WeatherParam[] = [
  "cape", "liftedIndex", "cin", "shear0_1km", "shear0_3km", "shear0_6km",
];

interface ModelSelectorProps {
  models: ModelForecast[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  forecastHour: number;
}

const ModelSelector = ({ models, selectedModel, onSelectModel, forecastHour }: ModelSelectorProps) => {
  const { t } = useI18n();
  const { units } = useUnits();
  const [view, setView] = useState<"basic" | "advanced" | "severe">("basic");

  if (!models || models.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        Loading models...
      </div>
    );
  }

  const active = models.find((m) => m.model === selectedModel) ?? models[0];

  if (!active?.hours?.length) {
    return null;
  }

  // Find closest hour index
  let hourIndex = active.hours.indexOf(forecastHour);
  if (hourIndex === -1) {
    hourIndex = 0;
    let minDiff = Math.abs(active.hours[0] - forecastHour);
    for (let i = 1; i < active.hours.length; i++) {
      const diff = Math.abs(active.hours[i] - forecastHour);
      if (diff < minDiff) { minDiff = diff; hourIndex = i; }
    }
  }

  const renderParams = (params: WeatherParam[]) => (
    <div className="grid grid-cols-4 gap-2">
      {params.map((param) => {
        const config = parameterConfig[param];
        const Icon = config.icon ? iconMap[config.icon] : null;
        const rawValue = active[param]?.[hourIndex];
        const isWindDir = param === "windDirection";
        const displayValue = isWindDir
          ? (rawValue == null ? "-" : degToCardinal(rawValue as number))
          : formatValue(rawValue as number | null | undefined, param, units);
        const unitLabel = isWindDir ? "" : getUnitLabel(param, units, config.unit);
        const translationKey = paramTranslationKey[param];

        return (
          <div key={param} className="glass-card rounded-xl p-3 text-center">
            {Icon && (
              isWindDir && rawValue != null ? (
                <Icon
                  className="w-4 h-4 text-accent-cyan mx-auto mb-1 transition-transform"
                  style={{ transform: `rotate(${(rawValue as number) + 180}deg)` }}
                />
              ) : (
                <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
              )
            )}
            <div className="font-heading font-bold text-lg">{displayValue}</div>
            <div className="text-[10px] text-muted-foreground font-body">{unitLabel || (isWindDir && rawValue != null ? `${Math.round(rawValue as number)}°` : "")}</div>
            <div className="text-[10px] text-muted-foreground font-body mt-0.5">
              {translationKey ? t(translationKey) : config.label}
            </div>
          </div>
        );
      })}
    </div>
  );

  const activeTransition = (active.transitions ?? [])
    .filter((t) => forecastHour >= t.hour)
    .sort((a, b) => b.hour - a.hour)[0];

  return (
    <div className="space-y-3">
      {/* Model tabs */}
      <div className="flex gap-1.5">
        {models.map((m) => {
          const isActive = m.model === selectedModel;
          return (
            <button
              key={m.model}
              onClick={() => onSelectModel(m.model)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-heading font-semibold transition-all flex-1 justify-center ${
                isActive
                  ? "border-transparent shadow-lg"
                  : "border border-border/50 opacity-50 hover:opacity-80 bg-muted/20"
              }`}
              style={{
                backgroundColor: isActive ? `${m.color}20` : undefined,
                color: isActive ? m.color : undefined,
                borderColor: isActive ? `${m.color}40` : undefined,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: m.color, opacity: isActive ? 1 : 0.4 }}
              />
              {m.model}
            </button>
          );
        })}
      </div>

      {activeTransition && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-body">
          <span className="font-semibold">{activeTransition.fromRun} → {activeTransition.toRun}</span>
          <span className="opacity-80">
            Latest {activeTransition.fromRun} run only reaches +{activeTransition.hour}h — showing previous {activeTransition.toRun} run beyond.
          </span>
        </div>
      )}

      {/* View tabs: Basic / Advanced / Severe */}
      <div className="flex gap-1.5 justify-center">
        {([
          { id: "basic" as const, label: t("basic") },
          { id: "advanced" as const, label: t("advanced") },
          { id: "severe" as const, label: "Severe" },
        ]).map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 py-1 rounded-md text-[11px] font-body font-medium transition-colors ${
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {view === "basic" && renderParams(BASIC_PARAMS)}
      {view === "advanced" && renderParams(ADVANCED_PARAMS)}
      {view === "severe" && renderParams(SEVERE_PARAMS)}
    </div>
  );
};

export default ModelSelector;
