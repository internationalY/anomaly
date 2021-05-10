import numpy as np
from typing import List, Tuple, Dict, Set, Union

def get_coords(coord_str):
    coord_str = coord_str.strip().split(' ')
    return [float(coord_str[0]), float(coord_str[1])]

def parse_geom(geom: str) -> List[float]:
    geom = geom[12: -1]  # remove 'LINESTRING (' and ')'
    coords = geom.split(',')
    return [get_coords(coords[0]), get_coords(coords[-1])]

def parse_full_geom(geom: str) -> List[float]:
    geom = geom[12: -1]  # remove 'LINESTRING (' and ')'
    coords = geom.split(',')
    return [get_coords(c) for c in coords]

def parse_position(position: str) -> List[float]:
    """Lat, Lon"""
    position = position[7:-1]
    coord = get_coords(position)
    return [coord[1], coord[0]]

def count_coverage_ratio(df, chosen_type):
    total_ratio = 0.0
    for idx in df.index:        
        for road_type in chosen_type:
            if road_type in idx:
                total_ratio += df.loc[idx]
                break
    print(f'{chosen_type} will take {total_ratio} percent.')

if __name__ == "__main__":
    test_string = 'LINESTRING (110.8598708 21.4391107, 110.8893308 21.4508543, 110.8887354 21.45037, 110.8601886 21.4392018)'
    print(parse_geom(test_string))

    test_string = 'POINT (111.0324133323577 21.619046985057945)'
    print(parse_position(test_string))