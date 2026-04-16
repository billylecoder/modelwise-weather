"""
FastAPI weather backend — fetches multi-model forecast data from Open-Meteo,
normalizes it into a unified structure, and serves it as a single JSON endpoint.
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL_CONFIGS = [
    {"id": "ecmwf_ifs025", "name": "ECMWF",   "color": "hsl(200, 80%, 55%)"},
    {"id": "gfs_seamless",  "name": "GFS",     "color": "hsl(140, 70%, 50%)"},
    {"id": "icon_seamless", "name": "ICON-EU", "color": "hsl(280, 70%, 60%)"},
    {"id": "gem_seamless",  "name": "GEM",     "color": "hsl(30, 90%, 55%)"},
]

HOURLY_PARAMS = [
    "temperature_2m",
    "precipitation",
    "wind_speed_10m",
    "wind_gusts_10m",
    "pressure_msl",
    "relative_humidity_2m",
    "dew_point_2m",
    "cape",
    "temperature_850hPa",
    "temperature_500hPa",
    "apparent_temperature",
    "cloud_cover",
]

MAX_HOURS = 360
DEFAULT_LAT = 37.9637
DEFAULT_LON = 23.7584

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ModelForecast(BaseModel):
    model: str
    color: str
    hours: list[int]
    temperature: list[float]
    precipitation: list[float]
    windSpeed: list[float]
    windGusts: list[float]
    pressure: list[float]
    humidity: list[float]
    dewPoint: list[float]
    cape: list[float]
    temp850hPa: list[float | None]
    temp500hPa: list[float | None]
    apparentTemperature: list[float | None]
    cloudCover: list[float | None]


class ForecastResponse(BaseModel):
    models: list[ModelForecast]
    startTime: str


# ---------------------------------------------------------------------------
# Data fetching helpers
# ---------------------------------------------------------------------------

def _build_url(lat: float, lon: float, model_id: str) -> str:
    params = ",".join(HOURLY_PARAMS)
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly={params}"
        f"&models={model_id}"
        f"&forecast_days=16"
        f"&timezone=auto"
    )


def _parse_model(data: dict[str, Any], name: str, color: str) -> ModelForecast | None:
    hourly = data.get("hourly")
    if not hourly or not hourly.get("time"):
        return None

    times = hourly["time"]
    start_ms = datetime.fromisoformat(times[0]).timestamp() * 1000

    hours: list[int] = []
    temp: list[float] = []
    precip: list[float] = []
    wind: list[float] = []
    gusts: list[float] = []
    pressure: list[float] = []
    humidity: list[float] = []
    dew: list[float] = []
    cape: list[float] = []
    temp850: list[float | None] = []
    temp500: list[float | None] = []
    apparent: list[float | None] = []
    cloud: list[float | None] = []

    for i, t in enumerate(times):
        h = round((datetime.fromisoformat(t).timestamp() * 1000 - start_ms) / 3_600_000)
        if h > MAX_HOURS:
            break
        val = hourly["temperature_2m"][i]
        if val is None:
            break

        hours.append(h)
        temp.append(val or 0)
        precip.append((hourly.get("precipitation") or [])[i] or 0 if i < len(hourly.get("precipitation", [])) else 0)
        wind.append((hourly.get("wind_speed_10m") or [])[i] or 0 if i < len(hourly.get("wind_speed_10m", [])) else 0)
        gusts.append((hourly.get("wind_gusts_10m") or [])[i] or 0 if i < len(hourly.get("wind_gusts_10m", [])) else 0)
        pressure.append((hourly.get("pressure_msl") or [])[i] or 0 if i < len(hourly.get("pressure_msl", [])) else 0)
        humidity.append((hourly.get("relative_humidity_2m") or [])[i] or 0 if i < len(hourly.get("relative_humidity_2m", [])) else 0)
        dew.append((hourly.get("dew_point_2m") or [])[i] or 0 if i < len(hourly.get("dew_point_2m", [])) else 0)
        cape.append((hourly.get("cape") or [])[i] or 0 if i < len(hourly.get("cape", [])) else 0)

        t850_arr = hourly.get("temperature_850hPa") or []
        temp850.append(t850_arr[i] if i < len(t850_arr) and t850_arr[i] is not None else None)
        t500_arr = hourly.get("temperature_500hPa") or []
        temp500.append(t500_arr[i] if i < len(t500_arr) and t500_arr[i] is not None else None)
        app_arr = hourly.get("apparent_temperature") or []
        apparent.append(app_arr[i] if i < len(app_arr) and app_arr[i] is not None else None)
        cloud_arr = hourly.get("cloud_cover") or []
        cloud.append(cloud_arr[i] if i < len(cloud_arr) and cloud_arr[i] is not None else None)

    if not hours:
        return None

    return ModelForecast(
        model=name,
        color=color,
        hours=hours,
        temperature=temp,
        precipitation=precip,
        windSpeed=wind,
        windGusts=gusts,
        pressure=pressure,
        humidity=humidity,
        dewPoint=dew,
        cape=cape,
        temp850hPa=temp850,
        temp500hPa=temp500,
        apparentTemperature=apparent,
        cloudCover=cloud,
    )


def _safe(arr: list | None, i: int) -> float:
    if arr and i < len(arr) and arr[i] is not None:
        return float(arr[i])
    return 0.0


async def _fetch_model(client: httpx.AsyncClient, cfg: dict, lat: float, lon: float) -> ModelForecast | None:
    url = _build_url(lat, lon, cfg["id"])
    try:
        resp = await client.get(url, timeout=15)
        resp.raise_for_status()
        return _parse_model(resp.json(), cfg["name"], cfg["color"])
    except Exception as exc:
        print(f"[WARN] Failed to fetch {cfg['name']}: {exc}")
        return None


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
CACHE_TTL = 600  # 10 minutes
_cache: dict[str, tuple[float, ForecastResponse]] = {}


def _cache_key(lat: float, lon: float) -> str:
    return f"{round(lat, 2)}:{round(lon, 2)}"


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="ModelWise Weather API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/forecast", response_model=ForecastResponse)
async def get_forecast(
    lat: float = Query(DEFAULT_LAT),
    lon: float = Query(DEFAULT_LON),
):
    """Fetch multi-model forecast, normalize to common hours, return unified JSON."""
    key = _cache_key(lat, lon)
    now = time.monotonic()

    if key in _cache:
        cached_at, cached_resp = _cache[key]
        if now - cached_at < CACHE_TTL:
            return cached_resp

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_model(client, cfg, lat, lon) for cfg in MODEL_CONFIGS]
        results = await asyncio.gather(*tasks)

    models = [m for m in results if m is not None and len(m.hours) > 0]

    if not models:
        return ForecastResponse(models=[], startTime=datetime.now(timezone.utc).isoformat())

    # Normalize to common length
    min_len = min(len(m.hours) for m in models)
    for m in models:
        m.hours = m.hours[:min_len]
        m.temperature = m.temperature[:min_len]
        m.precipitation = m.precipitation[:min_len]
        m.windSpeed = m.windSpeed[:min_len]
        m.windGusts = m.windGusts[:min_len]
        m.pressure = m.pressure[:min_len]
        m.humidity = m.humidity[:min_len]
        m.dewPoint = m.dewPoint[:min_len]
        m.cape = m.cape[:min_len]
        m.temp850hPa = m.temp850hPa[:min_len]
        m.temp500hPa = m.temp500hPa[:min_len]
        m.apparentTemperature = m.apparentTemperature[:min_len]
        m.cloudCover = m.cloudCover[:min_len]

    resp = ForecastResponse(
        models=models,
        startTime=datetime.now(timezone.utc).isoformat(),
    )
    _cache[key] = (now, resp)
    return resp


@app.get("/api/health")
async def health():
    return {"status": "ok"}
