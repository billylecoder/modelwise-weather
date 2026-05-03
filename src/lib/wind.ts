// Helpers for wind direction (degrees, meteorological "from" convention)
export function degToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) / 22.5) % 16;
  return dirs[i];
}

// Circular mean of an array of degrees (handles wrap-around correctly).
export function meanDegrees(values: number[]): number | null {
  if (values.length === 0) return null;
  let x = 0, y = 0;
  for (const v of values) {
    const r = (v * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  const mean = (Math.atan2(y / values.length, x / values.length) * 180) / Math.PI;
  return ((mean % 360) + 360) % 360;
}
