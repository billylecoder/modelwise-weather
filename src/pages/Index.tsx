import { useState, useEffect, useCallback } from "react";
import { Cloud, Layers, Activity, RefreshCw, MapPin } from "lucide-react";
import { models, defaultLocation, WeatherParam, Location, regenerateModels, getLastGeneratedAt } from "@/data/mockWeatherData";
import WeatherChart from "@/components/WeatherChart";
import ModelConfidence from "@/components/ModelAgreement";
import ParameterSelector from "@/components/ParameterSelector";
import ModelToggle from "@/components/ModelToggle";
import ForecastTimeline from "@/components/ForecastTimeline";
import ModelSelector from "@/components/ModelSelector";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const Index = () => {
  const [location] = useState<Location>(defaultLocation);
  const [selectedParam, setSelectedParam] = useState<WeatherParam>("temperature");
  const [enabledModels, setEnabledModels] = useState<string[]>(models.map((m) => m.model));
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState(models[0].model);
  const [lastRefresh, setLastRefresh] = useState(getLastGeneratedAt());

  const forecastHour = models[0].hours[timelineIndex] ?? 0;

  const refreshData = useCallback(() => {
    regenerateModels();
    setLastRefresh(Date.now());
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshData, SIX_HOURS_MS);
    return () => clearInterval(interval);
  }, [refreshData]);

  const toggleModel = (model: string) => {
    setEnabledModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const timeSinceRefresh = () => {
    const diff = Date.now() - lastRefresh;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Cloud className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-base leading-tight">WeatherIntel</h1>
              <p className="text-[10px] text-muted-foreground font-body">Multi-Model Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm font-body text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-heading font-semibold">{location.name}</span>
            <span className="text-xs text-muted-foreground">({location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°)</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
            <button onClick={refreshData} className="flex items-center gap-1.5 hover:text-foreground transition-colors" title="Refresh data">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{timeSinceRefresh()}</span>
            </button>
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

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        {/* Top row: Timeline + Model Selector */}
        <div className="grid grid-cols-2 gap-5">
          <ForecastTimeline
            value={timelineIndex}
            max={models[0].hours.length - 1}
            onChange={setTimelineIndex}
            hours={models[0].hours}
          />
          <ModelConfidence
            models={models}
            parameter={selectedParam}
            enabledModels={enabledModels}
            forecastHour={forecastHour}
          />
        </div>

        {/* Model data */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-heading font-semibold text-sm mb-4">Model Data</h2>
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            forecastHour={forecastHour}
          />
        </div>

        {/* Chart controls */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-sm">Multi-Model Comparison</h2>
            <ModelToggle models={models} enabledModels={enabledModels} onToggle={toggleModel} />
          </div>

          <div className="mb-4">
            <ParameterSelector selected={selectedParam} onChange={setSelectedParam} />
          </div>

          {/* Main chart */}
          <div className="mb-2">
            <h3 className="font-heading font-medium text-xs text-muted-foreground mb-2">
              {selectedParam.charAt(0).toUpperCase() + selectedParam.slice(1).replace(/([A-Z])/g, " $1")} Forecast
            </h3>
            <WeatherChart
              models={models}
              parameter={selectedParam}
              enabledModels={enabledModels}
            />
          </div>

          {/* Secondary charts */}
          {selectedParam !== "temperature" && (
            <div className="mt-5 pt-5 border-t border-border/30">
              <h3 className="font-heading font-medium text-xs text-muted-foreground mb-2">Temperature</h3>
              <WeatherChart models={models} parameter="temperature" enabledModels={enabledModels} />
            </div>
          )}

          {selectedParam !== "precipitation" && (
            <div className="mt-5 pt-5 border-t border-border/30">
              <h3 className="font-heading font-medium text-xs text-muted-foreground mb-2">Precipitation</h3>
              <WeatherChart models={models} parameter="precipitation" enabledModels={enabledModels} showArea />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
