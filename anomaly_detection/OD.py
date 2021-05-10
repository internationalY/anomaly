from .detect_toll_of_traj import TrajTollDetector
import numpy as np
import pandas as pd
import folium

class OD(object):
    def __init__(self, df):
        self.df = df
        self.df.set_index(np.arange(len(df)), inplace=True)

    def init_detector(self, tolls):
        self.tolls = tolls
        self.detector = TrajTollDetector(tolls)

    def detect_toll(self):
        assert self.detector is not None, "You should first init the detector to use this."
        uptoll_class_list, downtoll_class_list, uptoll_dis, downtoll_dis = [], [], [], []

        for idx, row in self.df.iterrows():
            coords, speeds = row['coords'], row['speeds']
            toll_class1, toll_coord1, toll_class2, toll_coord2, dis1, dis2 \
                = self.detector.detect_passed_toll_of_traj(coords, speeds, count_distance=True)
            uptoll_class_list.append(toll_class1)
            downtoll_class_list.append(toll_class2)
            uptoll_dis.append(dis1)
            downtoll_dis.append(dis2)
        self.df['uptoll_class'] = uptoll_class_list
        self.df['downtoll_class'] = downtoll_class_list
        self.df['uptoll_dis'] = uptoll_dis
        self.df['downtoll_dis'] = downtoll_dis

    def toll_distribution(self):
        pass

    def vis_trajs(self):
        pass

    def vis_uptoll_ratio(self, warehoue, start=True):
        assert self.tolls is not None, "You should first init the detector to use this."
        if start:
            df_warehouse = self.df[self.df['start_warehoue'] == warehoue]
            series_size = df_warehouse.groupby('uptoll_class').size()
        else:
            df_warehouse = self.df[self.df['end_warehoue'] == warehoue]
            series_size = df_warehouse.groupby('downtoll_class').size()
        total_num = series_size.sum()
        m = None
        warehoue_coord = self.warehoue_position(warehoue, start=start)
        for toll_class, toll_num in series_size.to_dict().items():
            toll_coord = np.array(self.tolls.get_coords_of_class(toll_class)).mean(axis=0)
            if m is None:
                m = folium.Map(toll_coord, zoom_start=12)
                folium.Marker(warehoue_coord).add_to(m)
            folium.Circle(
                radius=int(toll_num / total_num * 1500),
                location=toll_coord,
                popup=str(toll_class),
                color='red',
                fill=True,
                fill_color='red'
            ).add_to(m)
        return m

    def warehoue_position(self, warehouse_name, start=True):
        if start:
            df = self.df[self.df['start_warehoue'] == warehouse_name]
            coords = [c[0] for c in df['coords'].values]
        else:
            df = self.df[self.df['end_warehoue'] == warehouse_name]
            coords = [c[-1] for c in df['coords'].values]
        # print(coords)
        return np.array(coords).mean(0)