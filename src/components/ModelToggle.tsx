import { ModelForecast } from "@/data/mockWeatherData";

interface ModelToggleProps {
  models: ModelForecast[];
  enabledModels: string[];
  onToggle: (model: string) => void;
}

const ModelToggle = ({ models, enabledModels, onToggle }: ModelToggleProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {models.map((m) => {
        const isEnabled = enabledModels.includes(m.model);
        return (
          <button
            key={m.model}
            onClick={() => onToggle(m.model)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all border ${
              isEnabled
                ? "border-transparent"
                : "border-border/50 opacity-40 hover:opacity-70"
            }`}
            style={{
              backgroundColor: isEnabled ? `${m.color}20` : undefined,
              color: isEnabled ? m.color : undefined,
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: m.color, opacity: isEnabled ? 1 : 0.3 }}
            />
            {m.model}
          </button>
        );
      })}
    </div>
  );
};

export default ModelToggle;
