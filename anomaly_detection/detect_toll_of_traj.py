from toll_detection.poi_tolls import POITolls
import numpy as np
import folium
import geopy.distance

def count_distance_of_traj(coords):
    return sum([geopy.distance.distance(a, b).meters for a, b in zip(coords[:-1], coords[1:])])

class TrajTollDetector(object):
    
    def __init__(self, tolls):
        self.tolls = tolls
    
    def detect_passed_toll_of_traj(self, coords, speeds, count_distance=False):
        # toll_coords, dises = self.tolls.neareast_tolls_of_coords(coords)
        # top_idxs = np.argsort(dises)[:topk]
        # return [toll_coords[i] for i in top_idxs]
        start_coords, end_coords = self._segment_traj(coords, speeds)
        toll_class1, toll_coord1 = self._nearest_tolls(start_coords)
        toll_class2, toll_coord2 = self._nearest_tolls(end_coords)
        if not count_distance:
            return toll_class1, toll_coord1, toll_class2, toll_coord2
        else:
            dis1 = count_distance_of_traj(start_coords)
            dis2 = count_distance_of_traj(end_coords)
            return toll_class1, toll_coord1, toll_class2, toll_coord2, dis1, dis2

    def _segment_traj(self, coords, speeds):
        if not isinstance(speeds, np.ndarray):
            speeds = np.array(speeds)
        speeds = speeds.copy()
        abnormal_idxs = np.where(speeds > 34.7)[0]
        for i in abnormal_idxs:
            try:
                speeds[i] = speeds[i - 3: i].mean()  # 先用粗糙的写法处理
            except:
                print('abnormal!!')  
                speeds[i] = 10
        fast_speed_idxs = np.where(speeds > 22)[0]
        idx1, idx2 = fast_speed_idxs[0], fast_speed_idxs[-1]
        return coords[:idx1], coords[idx2:]

    def _nearest_tolls(self, coords):
        return self.tolls.neareast_tolls_of_coords(coords)

    def vis_traj_with_topk_toll(self, coords, speeds):
        m = folium.Map(coords[0], zoom_start=12)
        folium.PolyLine(coords).add_to(m)
        toll_class1, toll_coord1, toll_class2, toll_coord2 = self.detect_passed_toll_of_traj(coords, speeds)
        folium.Marker(toll_coord1).add_to(m)
        folium.Marker(toll_coord2).add_to(m)
        return m