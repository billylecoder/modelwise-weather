import { useState, useRef, useEffect } from "react";
import { Search, MapPin, X } from "lucide-react";
import { Location } from "@/data/weatherApi";

interface LocationSearchProps {
  currentLocation: Location;
  onLocationChange: (location: Location) => void;
}

const LocationSearch = ({ currentLocation, onLocationChange }: LocationSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = sampleLocations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(query.toLowerCase()) ||
      loc.country.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="flex items-center gap-2 px-4 py-2.5 glass-card rounded-xl hover:border-primary/50 transition-all group"
      >
        <MapPin className="w-4 h-4 text-primary" />
        <span className="font-heading font-medium text-sm">{currentLocation.name}</span>
        <span className="text-muted-foreground text-xs">{currentLocation.country}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 glass-card rounded-xl overflow-hidden z-50 border border-border/50">
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search location..."
                className="w-full pl-9 pr-8 py-2 bg-muted/50 rounded-lg text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((loc) => (
              <button
                key={loc.name}
                onClick={() => {
                  onLocationChange(loc);
                  setIsOpen(false);
                  setQuery("");
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                  loc.name === currentLocation.name ? "bg-primary/10" : ""
                }`}
              >
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-sm font-medium">{loc.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {loc.lat.toFixed(2)}°, {loc.lon.toFixed(2)}° · {loc.country}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
