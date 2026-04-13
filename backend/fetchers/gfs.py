import requests
import os

def fetch_gfs():
    os.makedirs("data", exist_ok=True)

    url = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl"

    params = {
        "file": "gfs.t00z.pgrb2.0p25.f003",
        "lev_2_m_above_ground": "on",
        "var_TMP": "on",
        "subregion": "",
        "leftlon": 20,
        "rightlon": 25,
        "toplat": 40,
        "bottomlat": 35,
        "dir": "/gfs.20260413/00/atmos"
    }

    r = requests.get(url, params=params)

    with open("data/gfs.grib2", "wb") as f:
        f.write(r.content)

    return "Downloaded"
