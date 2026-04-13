import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { ModelForecast, WeatherParam, parameterConfig } from "@/data/mockWeatherData";

interface WeatherChartProps {
  models: ModelForecast[];
  parameter: WeatherParam;
  enabledModels: string[];
  showArea?: boolean;
}

const WeatherChart = ({ models, parameter, enabledModels, showArea = false }: WeatherChartProps) => {
  const config = parameterConfig[parameter];

  const data = useMemo(() => {
    const hours = models[0].hours;
    return hours.map((h, i) => {
      const point: Record<string, number> = { hour: h };
      const vals: number[] = [];
      models.forEach((m) => {
        if (enabledModels.includes(m.model)) {
          point[m.model] = m[parameter][i];
          vals.push(m[parameter][i]);
        }
      });
      if (vals.length > 0) {
        point["Average"] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
      }
      return point;
    });
  }, [models, parameter, enabledModels]);

  const activeModels = models.filter((m) => enabledModels.includes(m.model));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="glass-card rounded-lg p-3 border border-border/50">
        <p className="text-xs text-muted-foreground font-body mb-2">+{label}h</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium font-heading text-xs">{entry.dataKey}</span>
            <span className="text-muted-foreground font-body ml-auto">
              {entry.value} {config.unit}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(235, 25%, 16%)" />
          <XAxis
            dataKey="hour"
            tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11, fontFamily: "Manrope" }}
            tickFormatter={(v) => `${v}h`}
            stroke="hsl(235, 25%, 16%)"
          />
          <YAxis
            tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 11, fontFamily: "Manrope" }}
            stroke="hsl(235, 25%, 16%)"
          />
          <Tooltip content={<CustomTooltip />} />
          {activeModels.map((m) =>
            showArea ? (
              <Area
                key={m.model}
                type="monotone"
                dataKey={m.model}
                stroke={m.color}
                fill={m.color}
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Line
                key={m.model}
                type="monotone"
                dataKey={m.model}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            )
          )}
          {/* Average line */}
          {activeModels.length > 1 && (
            showArea ? (
              <Area
                type="monotone"
                dataKey="Average"
                stroke="hsl(0, 0%, 100%)"
                fill="none"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="Average"
                stroke="hsl(0, 0%, 100%)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            )
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export default WeatherChart;
