import { useState, useEffect, useCallback } from "react";
import { Cloud, Layers, RefreshCw, MapPin, Loader2 } from "lucide-react";
import { defaultLocation, WeatherParam, Location, ModelForecast } from "@/data/weatherApi";
import { fetchWeatherData } from "@/data/weatherApi";
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
  const [models, setModels] = useState<ModelForecast[]>([]);
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState("");
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeatherData(location.lat, location.lon);
      if (data.length === 0) throw new Error("No model data returned");
      setModels(data);
      setEnabledModels(data.map((m) => m.model));
      setSelectedModel(data[0].model);
      setLastRefresh(Date.now());
    } catch (e: any) {
      setError(e.message || "Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  }, [location.lat, location.lon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, SIX_HOURS_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  const forecastHour = models[0]?.hours[timelineIndex] ?? 0;

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

  if (loading && models.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-body">Loading weather models for {location.name}…</p>
        </div>
      </div>
    );
  }

  if (error && models.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive font-body">{error}</p>
          <button onClick={loadData} className="text-xs text-primary hover:underline">Retry</button>
        </div>
      </div>
    );
  }

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
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{timeSinceRefresh()}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{models.length} models</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        {/* Top row */}
        <div className="grid grid-cols-2 gap-5">
          <ForecastTimeline
            value={timelineIndex}
            max={(models[0]?.hours.length ?? 1) - 1}
            onChange={setTimelineIndex}
            hours={models[0]?.hours ?? [0]}
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

          <div className="mb-2">
            <h3 className="font-heading font-medium text-xs text-muted-foreground mb-2">
              {selectedParam.charAt(0).toUpperCase() + selectedParam.slice(1).replace(/([A-Z])/g, " $1")} Forecast
            </h3>
            <WeatherChart models={models} parameter={selectedParam} enabledModels={enabledModels} />
          </div>

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
