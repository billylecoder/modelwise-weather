from fastapi import FastAPI
from backend.fetchers.gfs import fetch_gfs
from backend.parsers.grib import get_temperature

app = FastAPI()

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/fetch")
def fetch():
    return {"status": fetch_gfs()}

@app.get("/temperature")
def temperature():
    temp = get_temperature()
    return {"temperature": temp}