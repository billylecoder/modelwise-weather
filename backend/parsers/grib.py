import xarray as xr

def get_temperature():
    ds = xr.open_dataset("data/gfs.grib2", engine="cfgrib")
    temp_k = ds['t2m'].values
    temp_c = temp_k - 273.15
    return float(temp_c.mean())
