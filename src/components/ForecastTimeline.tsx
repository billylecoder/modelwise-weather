import { Slider } from "@/components/ui/slider";

interface ForecastTimelineProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  hours: number[];
}

const ForecastTimeline = ({ value, max, onChange, hours }: ForecastTimelineProps) => {
  const currentHour = hours[value] ?? 0;
  const days = Math.floor(currentHour / 24);
  const remainingHours = currentHour % 24;

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-body">Forecast Time</span>
        <div className="flex items-baseline gap-1">
          <span className="font-heading font-bold text-lg text-foreground">+{currentHour}h</span>
          <span className="text-xs text-muted-foreground font-body">
            ({days}d {remainingHours}h)
          </span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={max}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-muted-foreground font-body">Now</span>
        <span className="text-[10px] text-muted-foreground font-body">+{hours[hours.length - 1]}h</span>
      </div>
    </div>
  );
};

export default ForecastTimeline;
