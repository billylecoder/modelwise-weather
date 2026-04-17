import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n";
import { parseLocalNaiveISO, addHoursNaive, formatTimeHHMM, formatDateShort } from "@/lib/time";

interface ForecastTimelineProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  hours: number[];
  dataStartTime?: string; // local-naive ISO string of first forecast hour (in location's timezone)
}

const ForecastTimeline = ({ value, max, onChange, hours, dataStartTime }: ForecastTimelineProps) => {
  const { t } = useI18n();
  const currentHour = hours[value] ?? 0;
  const days = Math.floor(currentHour / 24);
  const remainingHours = currentHour % 24;

  // Compute the wall-clock forecast time at the location.
  // dataStartTime comes from Open-Meteo as local-naive (e.g. "2026-04-17T00:00")
  // so we must NOT pass it through `new Date()` directly.
  const getForecastDateTime = () => {
    const base = dataStartTime
      ? parseLocalNaiveISO(dataStartTime)
      : (() => {
          const now = new Date();
          return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hour: 0,
            minute: 0,
          };
        })();
    const target = addHoursNaive(base, currentHour);
    return { dateStr: formatDateShort(target), timeStr: formatTimeHHMM(target) };
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
          {dateStr} · {timeStr} <span className="text-[10px] text-muted-foreground font-body">local</span>
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
