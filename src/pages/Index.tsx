import { useState } from "react";
import { Cloud, Layers, Activity } from "lucide-react";
import { models, defaultLocation, WeatherParam, Location } from "@/data/mockWeatherData";
import LocationSearch from "@/components/LocationSearch";
import WeatherMap from "@/components/WeatherMap";
import WeatherChart from "@/components/WeatherChart";
import ModelAgreement from "@/components/ModelAgreement";
import ParameterSelector from "@/components/ParameterSelector";
import ModelToggle from "@/components/ModelToggle";
import ForecastTimeline from "@/components/ForecastTimeline";
import CurrentConditions from "@/components/CurrentConditions";

const Index = () => {
  const [location, setLocation] = useState<Location>(defaultLocation);
  const [selectedParam, setSelectedParam] = useState<WeatherParam>("temperature");
  const [enabledModels, setEnabledModels] = useState<string[]>(models.map((m) => m.model));
  const [timelineIndex, setTimelineIndex] = useState(0);

  const forecastHour = models[0].hours[timelineIndex] ?? 0;

  const toggleModel = (model: string) => {
    setEnabledModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Cloud className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-base leading-tight">WeatherIntel</h1>
              <p className="text-[10px] text-muted-foreground font-body">Multi-Model Intelligence</p>
            </div>
          </div>

          <LocationSearch currentLocation={location} onLocationChange={setLocation} />

          <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{enabledModels.length} models</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - split screen */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left: Map */}
        <div className="w-1/2 p-4 flex flex-col gap-4">
          <div className="flex-1">
            <WeatherMap location={location} onLocationChange={setLocation} />
          </div>
          <CurrentConditions models={models} forecastHour={forecastHour} />
        </div>

        {/* Right: Data panels */}
        <div className="w-1/2 border-l border-border/50 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Timeline */}
            <ForecastTimeline
              value={timelineIndex}
              max={models[0].hours.length - 1}
              onChange={setTimelineIndex}
              hours={models[0].hours}
            />

            {/* Model toggles */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-sm">Weather Models</h2>
              </div>
              <ModelToggle models={models} enabledModels={enabledModels} onToggle={toggleModel} />
            </div>

            {/* Model Agreement */}
            <ModelAgreement
              models={models}
              parameter={selectedParam}
              enabledModels={enabledModels}
              forecastHour={forecastHour}
            />

            {/* Parameter selector */}
            <div className="glass-card rounded-xl p-4">
              <h2 className="font-heading font-semibold text-sm mb-3">Parameters</h2>
              <ParameterSelector selected={selectedParam} onChange={setSelectedParam} />
            </div>

            {/* Main chart */}
            <div className="glass-card rounded-xl p-4">
              <h2 className="font-heading font-semibold text-sm mb-1">
                {selectedParam.charAt(0).toUpperCase() + selectedParam.slice(1).replace(/([A-Z])/g, " $1")} Forecast
              </h2>
              <p className="text-xs text-muted-foreground font-body mb-3">Multi-model comparison</p>
              <WeatherChart
                models={models}
                parameter={selectedParam}
                enabledModels={enabledModels}
              />
            </div>

            {/* Secondary charts */}
            {selectedParam !== "temperature" && (
              <div className="glass-card rounded-xl p-4">
                <h2 className="font-heading font-semibold text-sm mb-1">Temperature</h2>
                <p className="text-xs text-muted-foreground font-body mb-3">Reference overlay</p>
                <WeatherChart models={models} parameter="temperature" enabledModels={enabledModels} />
              </div>
            )}

            {selectedParam !== "precipitation" && (
              <div className="glass-card rounded-xl p-4">
                <h2 className="font-heading font-semibold text-sm mb-1">Precipitation</h2>
                <p className="text-xs text-muted-foreground font-body mb-3">Rainfall comparison</p>
                <WeatherChart models={models} parameter="precipitation" enabledModels={enabledModels} showArea />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
