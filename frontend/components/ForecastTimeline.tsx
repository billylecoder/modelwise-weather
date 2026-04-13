import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n";

interface ForecastTimelineProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  hours: number[];
  dataStartTime?: string; // ISO string of first forecast hour
}

const ForecastTimeline = ({ value, max, onChange, hours, dataStartTime }: ForecastTimelineProps) => {
  const { t } = useI18n();
  const currentHour = hours[value] ?? 0;
  const days = Math.floor(currentHour / 24);
  const remainingHours = currentHour % 24;

  // Calculate the actual date/time in EEST (UTC+3)
  const getForecastDateTime = () => {
    let base: Date;
    if (dataStartTime) {
      base = new Date(dataStartTime);
    } else {
      // Default: assume data starts at current date 00:00 EEST
      const now = new Date();
      base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }
    const forecastDate = new Date(base.getTime() + currentHour * 3600000);
    
    // Format in EEST (Europe/Athens)
    const dateStr = forecastDate.toLocaleDateString("en-GB", {
      timeZone: "Europe/Athens",
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
    const timeStr = forecastDate.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Athens",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return { dateStr, timeStr };
  };

  const { dateStr, timeStr } = getForecastDateTime();

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-body">{t("forecastTime")}</span>
        <div className="flex items-baseline gap-1">
          <span className="font-heading font-bold text-lg text-foreground">+{currentHour}h</span>
          <span className="text-xs text-muted-foreground font-body">
            ({days}d {remainingHours}h)
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-body">{t("date")}</span>
        <span className="text-sm font-heading font-semibold text-primary">
          {dateStr} · {timeStr} <span className="text-[10px] text-muted-foreground font-body">EEST</span>
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={max}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-muted-foreground font-body">{t("now")}</span>
        <span className="text-[10px] text-muted-foreground font-body">+{hours[hours.length - 1]}h</span>
      </div>
    </div>
  );
};

export default ForecastTimeline;
