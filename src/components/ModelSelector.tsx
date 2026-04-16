import { useState } from "react";
import { ModelForecast, parameterConfig, WeatherParam } from "@/data/weatherApi";
import { Thermometer, CloudRain, Wind, Gauge, Droplets, Zap, Cloud, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n, paramTranslationKey } from "@/i18n";

const iconMap: Record<string, React.ComponentType<any>> = {
  Thermometer, CloudRain, Wind, Gauge, Droplets, Zap, Cloud,
};

const BASIC_PARAMS: WeatherParam[] = ["temperature", "apparentTemperature", "precipitation", "windSpeed", "humidity", "cloudCover"];
const ADVANCED_PARAMS: WeatherParam[] = ["windGusts", "pressure", "dewPoint", "cape", "temp850hPa", "temp500hPa"];

interface ModelSelectorProps {
  models: ModelForecast[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  forecastHour: number;
}

const ModelSelector = ({ models, selectedModel, onSelectModel, forecastHour }: ModelSelectorProps) => {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const active = models.find((m) => m.model === selectedModel) ?? models[0];
  
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
        const value = active[param]?.[hourIndex];
        const displayValue = value === null || value === undefined ? "-" : value;
        const translationKey = paramTranslationKey[param];

        return (
          <div key={param} className="glass-card rounded-xl p-3 text-center">
            {Icon && <Icon className="w-4 h-4 text-primary mx-auto mb-1" />}
            <div className="font-heading font-bold text-lg">{displayValue}</div>
            <div className="text-[10px] text-muted-foreground font-body">{config.unit}</div>
            <div className="text-[10px] text-muted-foreground font-body mt-0.5">
              {translationKey ? t(translationKey) : config.label}
            </div>
          </div>
        );
      })}
    </div>
  );

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

      {/* Basic parameters */}
      {renderParams(BASIC_PARAMS)}

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-body mx-auto"
      >
        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showAdvanced ? t("basic") : t("advanced")}
      </button>

      {/* Advanced parameters */}
      {showAdvanced && renderParams(ADVANCED_PARAMS)}
    </div>
  );
};

export default ModelSelector;
