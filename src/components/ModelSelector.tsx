import { ModelForecast, parameterConfig, WeatherParam } from "@/data/mockWeatherData";
import { Thermometer, CloudRain, Wind, Gauge, Droplets } from "lucide-react";

const iconMap: Record<string, React.ComponentType<any>> = {
  Thermometer, CloudRain, Wind, Gauge, Droplets,
};

interface ModelSelectorProps {
  models: ModelForecast[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  forecastHour: number;
}

const ModelSelector = ({ models, selectedModel, onSelectModel, forecastHour }: ModelSelectorProps) => {
  const active = models.find((m) => m.model === selectedModel) ?? models[0];
  const hourIndex = active.hours.indexOf(forecastHour);

  const params: WeatherParam[] = ["temperature", "precipitation", "windSpeed", "windGusts", "pressure", "humidity", "dewPoint", "cape"];

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

      {/* Parameter grid for selected model */}
      <div className="grid grid-cols-4 gap-2">
        {params.map((param) => {
          const config = parameterConfig[param];
          const Icon = config.icon ? iconMap[config.icon] : null;
          const value = active[param][hourIndex];

          return (
            <div key={param} className="glass-card rounded-xl p-3 text-center">
              {Icon && <Icon className="w-4 h-4 text-primary mx-auto mb-1" />}
              <div className="font-heading font-bold text-lg">{value}</div>
              <div className="text-[10px] text-muted-foreground font-body">{config.unit}</div>
              <div className="text-[10px] text-muted-foreground font-body mt-0.5">{config.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModelSelector;
