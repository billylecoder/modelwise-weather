import { useEffect, useRef, useState } from "react";
import { Play, Pause, Gauge } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n";
import { parseLocalNaiveISO, addHoursNaive, formatTimeHHMM, formatDateShort } from "@/lib/time";

interface ForecastTimelineProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  hours: number[];
  dataStartTime?: string;
}

const SPEEDS: { label: string; ms: number }[] = [
  { label: "1×", ms: 700 },
  { label: "2×", ms: 350 },
  { label: "4×", ms: 150 },
];

const ForecastTimeline = ({ value, max, onChange, hours, dataStartTime }: ForecastTimelineProps) => {
  const { t } = useI18n();
  const currentHour = hours[value] ?? 0;
  const days = Math.floor(currentHour / 24);
  const remainingHours = currentHour % 24;

  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = valueRef.current + 1;
      if (next > max) {
        onChange(0);
      } else {
        onChange(next);
      }
    }, SPEEDS[speedIdx].ms);
    return () => clearInterval(id);
  }, [playing, speedIdx, max, onChange]);

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
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="shrink-0 w-7 h-7 rounded-md bg-primary/15 hover:bg-primary/25 text-primary flex items-center justify-center transition-colors"
          title={playing ? t("pause") : t("play")}
          aria-label={playing ? t("pause") : t("play")}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
          className="shrink-0 h-7 px-2 rounded-md bg-muted/30 hover:bg-muted/50 text-foreground flex items-center gap-1 transition-colors"
          title={t("playbackSpeed")}
        >
          <Gauge className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] font-heading font-semibold">{SPEEDS[speedIdx].label}</span>
        </button>
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          max={max}
          step={1}
          className="w-full"
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-muted-foreground font-body">{t("now")}</span>
        <span className="text-[10px] text-muted-foreground font-body">+{hours[hours.length - 1]}h</span>
      </div>
    </div>
  );
};

export default ForecastTimeline;
