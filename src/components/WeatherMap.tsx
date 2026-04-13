import { Location } from "@/data/weatherApi";
import { MapPin, Crosshair } from "lucide-react";

interface WeatherMapProps {
  location: Location;
  onLocationChange: (location: Location) => void;
}

const WeatherMap = ({ location }: WeatherMapProps) => {
  // Simulated map with grid and location pin
  const gridLines = Array.from({ length: 12 });

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden glass-card">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20">
        {gridLines.map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute w-full border-t border-primary/20"
            style={{ top: `${(i + 1) * (100 / 13)}%` }}
          />
        ))}
        {gridLines.map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute h-full border-l border-primary/20"
            style={{ left: `${(i + 1) * (100 / 13)}%` }}
          />
        ))}
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />

      {/* Simulated weather patterns */}
      <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full bg-chart-ecmwf/10 blur-3xl animate-pulse" />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-chart-gfs/10 blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-1/3 left-1/2 w-28 h-28 rounded-full bg-chart-icon/8 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Location marker */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-primary/30" />
          <MapPin className="relative w-8 h-8 text-primary drop-shadow-lg" />
        </div>
        <div className="mt-3 px-3 py-1.5 glass-card rounded-lg">
          <p className="font-heading text-sm font-semibold">{location.name}</p>
          <p className="text-xs text-muted-foreground font-body">
            {location.lat.toFixed(4)}°N, {Math.abs(location.lon).toFixed(4)}°{location.lon >= 0 ? "E" : "W"}
          </p>
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-4 right-4 flex items-center gap-1 glass-card rounded-lg px-2 py-1">
        <Crosshair className="w-3 h-3 text-primary" />
        <span className="text-xs font-body text-muted-foreground">N</span>
      </div>

      {/* Scale bar */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="w-16 h-0.5 bg-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground font-body">50 km</span>
      </div>

      {/* Coordinates overlay */}
      <div className="absolute bottom-4 right-4 glass-card rounded-lg px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground font-mono">
          {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
        </p>
      </div>
    </div>
  );
};

export default WeatherMap;
