"""
FastAPI weather backend — fetches multi-model forecast data from Open-Meteo,
normalizes it into a unified structure, and serves it as a single JSON endpoint.

Run locally:
    uvicorn backend.main:app --host 0.0.0.0 --port 8000

Configure CORS via the WEATHER_CORS_ORIGINS env var (comma separated, "*" by default).
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

log = logging.getLogger("weather")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL_CONFIGS = [
    {"id": "ecmwf_ifs025", "name": "ECMWF",   "color": "hsl(200, 80%, 55%)"},
    {"id": "gfs_seamless",  "name": "GFS",     "color": "hsl(140, 70%, 50%)"},
    {"id": "icon_global",   "name": "ICON",    "color": "hsl(280, 70%, 60%)"},
    {"id": "gem_seamless",  "name": "GEM",     "color": "hsl(30, 90%, 55%)"},
]

# Keep these in sync with src/data/weatherApi.ts
HOURLY_PARAMS = [
    "temperature_2m",
    "precipitation",
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "pressure_msl",
    "relative_humidity_2m",
    "dew_point_2m",
    "cape",
    "temperature_850hPa",
    "temperature_500hPa",
    "apparent_temperature",
    "cloud_cover",
    "snowfall",
    "snow_depth",
]

# Open-Meteo field -> frontend field
FIELD_MAP: dict[str, str] = {
    "temperature_2m": "temperature",
    "precipitation": "precipitation",
    "wind_speed_10m": "windSpeed",
    "wind_gusts_10m": "windGusts",
    "wind_direction_10m": "windDirection",
    "pressure_msl": "pressure",
    "relative_humidity_2m": "humidity",
    "dew_point_2m": "dewPoint",
    "cape": "cape",
    "temperature_850hPa": "temp850hPa",
    "temperature_500hPa": "temp500hPa",
    "apparent_temperature": "apparentTemperature",
    "cloud_cover": "cloudCover",
    "snowfall": "snowfall",
    "snow_depth": "snowDepth",
}

MAX_HOURS = 360
DEFAULT_LAT = 37.9838
DEFAULT_LON = 23.7275
CACHE_TTL = 600  # seconds
HTTP_TIMEOUT = 20.0

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

Number = float | None


class ModelForecast(BaseModel):
    model: str
    color: str
    hours: list[int]
    temperature: list[Number]
    precipitation: list[Number]
    precipitationTotal: list[Number]
    windSpeed: list[Number]
    windGusts: list[Number]
    windDirection: list[Number]
    pressure: list[Number]
    humidity: list[Number]
    dewPoint: list[Number]
    cape: list[Number]
    temp850hPa: list[Number]
    temp500hPa: list[Number]
    apparentTemperature: list[Number]
    cloudCover: list[Number]
    snowfall: list[Number]
    snowDepth: list[Number]


class ForecastResponse(BaseModel):
    models: list[ModelForecast]
    startTime: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_url(lat: float, lon: float, model_id: str) -> str:
    params = ",".join(HOURLY_PARAMS)
    return (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly={params}"
        f"&models={model_id}"
        f"&forecast_days=16&timezone=auto"
    )


def _deinterpolate_precip(arr: list[Number]) -> list[Number]:
    """Spread bucketed precipitation totals evenly across the bucket hours."""
    out = list(arr)
    i = 0
    n = len(out)
    while i < n:
        v = out[i]
        if v is None or v == 0:
            i += 1
            continue
        j = i + 1
        while j < n and out[j] == v:
            j += 1
        run = j - i
        if run >= 2:
            per = v / run
            for k in range(i, j):
                out[k] = per
        i = j
    return out


def _parse_model(data: dict[str, Any], name: str, color: str) -> tuple[ModelForecast, str] | None:
    hourly = data.get("hourly")
    if not hourly or not hourly.get("time"):
        return None

    times: list[str] = hourly["time"]
    start_iso = times[0]
    start_ms = datetime.fromisoformat(start_iso).timestamp() * 1000

    series: dict[str, list[Number]] = {dst: [] for dst in FIELD_MAP.values()}
    hours: list[int] = []

    temp_src = hourly.get("temperature_2m") or []

    for i, t in enumerate(times):
        h = round((datetime.fromisoformat(t).timestamp() * 1000 - start_ms) / 3_600_000)
        if h > MAX_HOURS:
            break
        if i >= len(temp_src) or temp_src[i] is None:
            # primary signal missing — stop here (trim trailing nulls)
            break
        hours.append(h)
        for src, dst in FIELD_MAP.items():
            arr = hourly.get(src) or []
            v = arr[i] if i < len(arr) else None
            if v is not None and dst in ("cape", "snowfall", "snowDepth"):
                v = max(0.0, float(v))
            if v is not None and dst == "snowDepth":
                v *= 100  # m -> cm
            if v is not None and dst == "windDirection":
                v = ((float(v) % 360) + 360) % 360
            series[dst].append(v)

    if not hours:
        return None

    precip = _deinterpolate_precip(series["precipitation"])
    snow = _deinterpolate_precip(series["snowfall"])
    series["precipitation"] = precip
    series["snowfall"] = snow

    # Cumulative precipitation
    acc = 0.0
    precip_total: list[Number] = []
    for v in precip:
        if v is not None:
            acc += v
        precip_total.append(round(acc, 2))

    return (
        ModelForecast(
            model=name,
            color=color,
            hours=hours,
            precipitationTotal=precip_total,
            **series,
        ),
        start_iso,
    )


async def _fetch_model(
    client: httpx.AsyncClient, cfg: dict[str, str], lat: float, lon: float
) -> tuple[ModelForecast, str] | None:
    try:
        resp = await client.get(_build_url(lat, lon, cfg["id"]), timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        return _parse_model(resp.json(), cfg["name"], cfg["color"])
    except Exception as exc:
        log.warning("Failed to fetch %s: %s", cfg["name"], exc)
        return None


# ---------------------------------------------------------------------------
# Cache (per (lat, lon) rounded to 2 decimals)
# ---------------------------------------------------------------------------

_cache: dict[str, tuple[float, ForecastResponse]] = {}


def _cache_key(lat: float, lon: float) -> str:
    return f"{round(lat, 2)}:{round(lon, 2)}"


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

_origins_env = os.getenv("WEATHER_CORS_ORIGINS", "*").strip()
ALLOWED_ORIGINS = ["*"] if _origins_env == "*" else [o.strip() for o in _origins_env.split(",") if o.strip()]

app = FastAPI(title="ModelWise Weather API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/forecast", response_model=ForecastResponse)
async def get_forecast(
    lat: float = Query(DEFAULT_LAT, ge=-90, le=90),
    lon: float = Query(DEFAULT_LON, ge=-180, le=180),
) -> ForecastResponse:
    key = _cache_key(lat, lon)
    now = time.monotonic()
    cached = _cache.get(key)
    if cached and now - cached[0] < CACHE_TTL:
        return cached[1]

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(
            *[_fetch_model(client, cfg, lat, lon) for cfg in MODEL_CONFIGS]
        )

    parsed = [r for r in results if r is not None]
    if not parsed:
        raise HTTPException(status_code=502, detail="No forecast data available upstream")

    # Align onto a unified absolute-time grid starting at the earliest model start.
    start_ms = [datetime.fromisoformat(iso).timestamp() * 1000 for _, iso in parsed]
    global_start_ms = min(start_ms)
    global_start_iso = datetime.fromtimestamp(global_start_ms / 1000, tz=timezone.utc).isoformat()

    max_abs = 0
    for (m, iso) in parsed:
        offset_h = round((datetime.fromisoformat(iso).timestamp() * 1000 - global_start_ms) / 3_600_000)
        last = m.hours[-1] + offset_h
        if last > max_abs:
            max_abs = last
    unified_hours = list(range(max_abs + 1))

    fields = list(FIELD_MAP.values()) + ["precipitationTotal"]
    models: list[ModelForecast] = []
    for (m, iso) in parsed:
        offset_h = round((datetime.fromisoformat(iso).timestamp() * 1000 - global_start_ms) / 3_600_000)
        idx_map = {h + offset_h: i for i, h in enumerate(m.hours)}
        for f in fields:
            src = getattr(m, f)
            realigned = [src[idx_map[h]] if h in idx_map else None for h in unified_hours]
            setattr(m, f, realigned)
        m.hours = unified_hours
        models.append(m)

    resp = ForecastResponse(models=models, startTime=global_start_iso)
    _cache[key] = (now, resp)
    return resp


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
