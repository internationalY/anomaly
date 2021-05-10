import numpy as np
from typing import List, Tuple, Dict, Set, Union
from datetime import datetime
import time

def get_coords(coord_str): 
    """"""
    coord_str = coord_str.strip().split(' ')
    return [float(coord_str[1]), float(coord_str[0])]  # lat, lon

def parse_geom(geom: str) -> List[float]:
    geom = geom[12: -1]  # remove 'LINESTRING (' and ')'
    coords = geom.split(',')
    return [get_coords(coord) for coord in coords]  # lat, lon

def parse_position(position: str) -> List[float]:
    """Lat, Lon"""
    position = position[7:-1]  # remove 'POINT(' and ')'
    coord = get_coords(position)
    return coord

def parse_time_series(time_series: str) -> List[int]:
    time_strs = time_series.split(";")
    return [parse_time(time_piece) for time_piece in time_strs]

def parse_time(time_str: str) -> int:
    if not isinstance(time_str, str):
        time_str = str(time_str) + '.0'
    return int(time.mktime(datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S.%f").timetuple()))

def values2list(values):
    return [ele for ele in values]

if __name__ == "__main__":
    """sanity check"""
    print(1)
    print(parse_time('2020-04-17 18:29:55.5234'))