import { ModelForecast, WeatherParam, parameterConfig } from "@/data/weatherApi";
import { Thermometer, CloudRain, Wind, Gauge, Droplets, Zap } from "lucide-react";

const iconMap: Record<string, React.ComponentType<any>> = {
  Thermometer, CloudRain, Wind, Gauge, Droplets, Zap,
};

interface CurrentConditionsProps {
  models: ModelForecast[];
  forecastHour: number;
}

const CurrentConditions = ({ models, forecastHour }: CurrentConditionsProps) => {
  const hourIndex = models[0].hours.indexOf(forecastHour);
  
  // Use ECMWF as primary display
  const primary = models[0];
  const params: WeatherParam[] = ["temperature", "precipitation", "windSpeed", "pressure", "humidity", "cape"];

  return (
    <div className="grid grid-cols-3 gap-2">
      {params.map((param) => {
        const config = parameterConfig[param];
        const Icon = iconMap[config.icon] || Thermometer;
        const value = primary[param][hourIndex];

        return (
          <div key={param} className="glass-card rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="font-heading font-bold text-lg">{value}</div>
            <div className="text-[10px] text-muted-foreground font-body">{config.unit}</div>
            <div className="text-[10px] text-muted-foreground font-body mt-0.5">{config.label}</div>
          </div>
        );
      })}
    </div>
  );
};

export default CurrentConditions;
