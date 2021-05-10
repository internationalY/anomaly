import numpy as np
from sklearn.cluster import DBSCAN 
import matplotlib.pyplot as plt
import folium
import json


class WarehouseDetector(object):
    """Detector the warehose in order to calibrate lorry trajectory start and end point
    
    Input points are generated from stay point detection. There are two main senarios which
    Lorry will stay a while: 1. reach the warehouse 2. reach expressway service area.
    This Class will do clustering to detect the warehose and calibrate lorry trajectory start and end point.
    """

    def __init__(self, points, eps, min_samples, leaf_size, citys_json):
        self.points = points
        self.dbscan = DBSCAN(eps=eps, min_samples=min_samples, 
            metric='haversine', algorithm='ball_tree', leaf_size=leaf_size).fit(points)
        self.labels = self.dbscan.labels_
        self.n_clusters_ = len(set(self.labels)) - (1 if -1 in self.labels else 0)
        self.n_noise_ = list(self.labels).count(-1)

        with open(citys_json, 'rb') as f:
            self.city_range = json.load(f)
        self._city_label()

    def _city_label(self):
        times_count = {}
        self.label_to_city = {}
        unique_labels = set(self.labels) 
        for l in unique_labels:
            if l == -1:
                continue
            place = self.points[self.labels == l].mean(0)
            city_name = self._get_city(place)
            if city_name == 'other':
                self.labels[self.labels == l] = -1
                continue
            times_count[city_name] = times_count.get(city_name, -1) + 1
            self.label_to_city[l] = city_name + str(times_count[city_name])
    
    def get_label_and_name(self):
        return self.labels, self.label_to_city

    def draw_clusters(self):
        X = np.array([[c[1], c[0]] for c in self.points])
        core_samples_mask = np.zeros_like(self.labels, dtype=bool)
        core_samples_mask[self.dbscan.core_sample_indices_] = True
        unique_labels = set(self.labels)
        colors = [plt.cm.Spectral(each)
          for each in np.linspace(0, 1, len(unique_labels))]
        for k, col in zip(unique_labels, colors):
            if k == -1:
                # Black used for noise.
                # continue
                col = [0, 0, 0, 1]

            class_member_mask = (self.labels == k)
            xy = X[class_member_mask & core_samples_mask]
            plt.plot(xy[:, 0], xy[:, 1], 'o', markerfacecolor=tuple(col),
                    markeredgecolor='k', markersize=9)

            xy = X[class_member_mask & ~core_samples_mask]
            plt.plot(xy[:, 0], xy[:, 1], 'o', markerfacecolor=tuple(col),
                    markeredgecolor='k', markersize=1)

        plt.title('Estimated number of warehouses: %d' % self.n_clusters_)
        plt.show()

    def draw_core_position(self):
        unique_labels = set(self.labels)        
        m = None
        for l in unique_labels:
            if l == -1:
                continue
            place = self.points[self.labels == l].mean(0)
            if m == None:
                m = folium.Map(place, zoom_start=11)
            city_name = self._get_city(place)
            if city_name == 'other':
                continue
            info = str(city_name) + ' ' + '%.3f, %.3f' % (place[0], place[1])
            folium.Marker(place, popup=info).add_to(m)
        return m

    def _get_city(self, coord):
        lat, lon = coord
        for city_name in self.city_range.keys():
            geo_range = self.city_range[city_name]
            if lat >= geo_range['lat_min'] and lat <= geo_range['lat_max'] and lon >= geo_range['lon_min'] and lon <= geo_range['lon_max']:
                return city_name
        return 'other'
