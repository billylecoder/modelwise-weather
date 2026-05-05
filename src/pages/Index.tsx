import { useState, useEffect, useCallback } from "react";
import { Cloud, Layers, RefreshCw, Loader2, AlertTriangle, Home } from "lucide-react";
import { WeatherParam, Location, ModelForecast, AirInfo } from "@/data/weatherApi";
import { fetchWeatherData } from "@/data/weatherApi";
import WeatherChart from "@/components/WeatherChart";
import ModelConfidence from "@/components/ModelAgreement";
import ParameterSelector from "@/components/ParameterSelector";
import ModelToggle from "@/components/ModelToggle";
import ForecastTimeline from "@/components/ForecastTimeline";
import ModelSelector from "@/components/ModelSelector";
import HourlyForecast from "@/components/HourlyForecast";
import DailyForecast from "@/components/DailyForecast";
import LanguageToggle from "@/components/LanguageToggle";
import LocationSearch from "@/components/LocationSearch";
import LocationPickerScreen from "@/components/LocationPickerScreen";
import SettingsPanel from "@/components/SettingsPanel";
import InfoTab from "@/components/InfoTab";
import WarningsBanner from "@/components/WarningsBanner";
import WarningsTab from "@/components/WarningsTab";
import CreditsFooter from "@/components/CreditsFooter";
import { useI18n, paramTranslationKey } from "@/i18n";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const STORAGE_KEY = "wi:location";

function loadStoredLocation(): Location | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.lat === "number" && typeof v?.lon === "number" && typeof v?.name === "string") {
      return { name: v.name, lat: v.lat, lon: v.lon, country: v.country ?? "" };
    }
  } catch {}
  return null;
}

const Index = () => {
  const { t } = useI18n();
  const [location, setLocation] = useState<Location | null>(() => loadStoredLocation());
  const [selectedParam, setSelectedParam] = useState<WeatherParam>("temperature");
  const [models, setModels] = useState<ModelForecast[]>([]);
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState("");
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataStartTime, setDataStartTime] = useState<string>("");
  const [airInfo, setAirInfo] = useState<AirInfo | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"forecast" | "warnings" | "info">("forecast");

  const goHome = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setLocation(null);
    setModels([]);
    setEnabledModels([]);
    setActiveTab("forecast");
  }, []);

  const updateLocation = useCallback((loc: Location) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)); } catch {}
    setLocation(loc);
  }, []);

  const loadData = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const { models: data, startTime, airInfo: ai } = await fetchWeatherData(location.lat, location.lon);
      if (data.length === 0) throw new Error("No model data returned");
      setModels(data);
      setDataStartTime(startTime);
      setAirInfo(ai);
      setEnabledModels(data.map((m) => m.model));
      setSelectedModel(data[0].model);
      setLastRefresh(Date.now());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (location) loadData();
  }, [loadData, location]);

  useEffect(() => {
    if (!location) return;
    const interval = setInterval(loadData, SIX_HOURS_MS);
    return () => clearInterval(interval);
  }, [loadData, location]);

  const forecastHour = models[0]?.hours[timelineIndex] ?? 0;
  const showReliabilityWarning = forecastHour > 120;

  const toggleModel = (model: string) => {
    setEnabledModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const timeSinceRefresh = () => {
    const diff = Date.now() - lastRefresh;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return `${mins}${t("mAgo")}`;
    return `${Math.floor(mins / 60)}${t("hAgo")}`;
  };

  const getParamLabel = (param: WeatherParam) => {
    const key = paramTranslationKey[param];
    return key ? t(key) : param;
  };

  if (!location) {
    return <LocationPickerScreen onSelect={updateLocation} />;
  }

  if (loading && models.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-body">{t("loading")} {location.name}…</p>
        </div>
      </div>
    );
  }

  if (error && models.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive font-body">{error}</p>
          <button onClick={loadData} className="text-xs text-primary hover:underline">{t("retry")}</button>
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
              <h1 className="font-heading font-bold text-base leading-tight text-gradient">{t("appName")}</h1>
              <p className="text-[10px] text-muted-foreground font-body">{t("appSubtitle")}</p>
            </div>
          </div>

          <LocationSearch currentLocation={location} onSelectLocation={updateLocation} />

          <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
            <button
              onClick={goHome}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              title={t("home")}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("home")}</span>
            </button>
            <SettingsPanel />
            <LanguageToggle />
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50"
              title={t("refreshData")}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{timeSinceRefresh()}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{models.length} {t("models")}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/40">
          {([
            { id: "forecast" as const, label: t("forecastTab") },
            { id: "warnings" as const, label: t("warningsTab") },
            { id: "info" as const, label: t("infoTab") },
          ]).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-heading font-semibold transition-all border-b-2 -mb-px ${
                  active
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Official warnings (always visible across tabs) */}
        <WarningsBanner lat={location.lat} lon={location.lon} country={location.country} locationName={location.name} />

        {activeTab === "forecast" ? (
          <>
            {/* Top row */}
            <div className="grid grid-cols-2 gap-5">
              <ForecastTimeline
                value={timelineIndex}
                max={(models[0]?.hours.length ?? 1) - 1}
                onChange={setTimelineIndex}
                hours={models[0]?.hours ?? [0]}
                dataStartTime={dataStartTime}
              />
              <ModelConfidence
                models={models}
                parameter={selectedParam}
                enabledModels={enabledModels}
                forecastHour={forecastHour}
              />
            </div>

            {/* Reliability warning */}
            {showReliabilityWarning && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300 font-body">{t("forecastWarning")}</span>
              </div>
            )}

            {/* Model data */}
            <div className="glass-card rounded-xl p-5">
              <h2 className="font-heading font-semibold text-sm mb-4">{t("modelData")}</h2>
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                forecastHour={forecastHour}
              />
            </div>

            <HourlyForecast models={models} enabledModels={enabledModels} dataStartTime={dataStartTime} />

            <DailyForecast models={models} enabledModels={enabledModels} dataStartTime={dataStartTime} />

            {/* Chart controls */}
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-sm">{t("multiModelComparison")}</h2>
                <ModelToggle models={models} enabledModels={enabledModels} onToggle={toggleModel} />
              </div>

              <div className="mb-4">
                <ParameterSelector selected={selectedParam} onChange={setSelectedParam} />
              </div>

              <div className="mb-2">
                <h3 className="font-heading font-medium text-xs text-muted-foreground mb-2">
                  {getParamLabel(selectedParam)}
                </h3>
                <WeatherChart
                  models={models}
                  parameter={selectedParam}
                  enabledModels={enabledModels}
                  showArea={selectedParam === "precipitation"}
                />
              </div>
            </div>
          </>
        ) : (
          <InfoTab airInfo={airInfo} dataStartTime={dataStartTime} forecastHour={forecastHour} />
        )}

        <CreditsFooter />
      </div>
    </div>
  );
};

export default Index;
