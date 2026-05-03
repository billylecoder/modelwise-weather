import { WeatherParam, parameterConfig } from "@/data/weatherApi";
import { useI18n, paramTranslationKey } from "@/i18n";
import { Thermometer, CloudRain, Wind, Gauge, Droplets, Zap, Cloud, Snowflake, Sun, Compass } from "lucide-react";

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Thermometer, CloudRain, Wind, Gauge, Droplets, Zap, Cloud, Snowflake, Sun, Compass,
};

interface ParameterSelectorProps {
  selected: WeatherParam;
  onChange: (param: WeatherParam) => void;
}

const ParameterSelector = ({ selected, onChange }: ParameterSelectorProps) => {
  const { t } = useI18n();
  const params = Object.entries(parameterConfig) as [WeatherParam, typeof parameterConfig[WeatherParam]][];

  return (
    <div className="flex flex-wrap gap-1.5">
      {params.map(([key, config]) => {
        const Icon = iconMap[config.icon] || Thermometer;
        const isActive = selected === key;
        const translationKey = paramTranslationKey[key];
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
              isActive
                ? "bg-primary text-primary-foreground glow-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {translationKey ? t(translationKey) : config.label}
          </button>
        );
      })}
    </div>
  );
};

export default ParameterSelector;
