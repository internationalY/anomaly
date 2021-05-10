import pandas as pd
import numpy as np
from .warehouse_detector import WarehouseDetector
from .utils import values2list
from string import digits
from .OD import OD


class TrajCombiner(object):
    """Combine the segmented trajectory so that origin and destination of each 
        trajectory will be warehose."""

    def __init__(self, pkl_path=None, df_segmented=None):
        if pkl_path is not None:
            self.df_combined = pd.read_pickle(pkl_path)
        elif df_segmented is not None:
            self.df_segmented = df_segmented
            self._detect_warehouse()
            self._combine_traj()
            self._od_info()
        else:
            raise Exception("Parameters are not set properly!")

    def _detect_warehouse(self, eps=0.01, min_samples=40, leaf_size=10):
        points = np.array(values2list(self.df_segmented['start_pos'].values) + values2list(self.df_segmented['end_pos'].values))
        self.warehoue_detector = WarehouseDetector(points, eps, min_samples, leaf_size, 'CityGrid.json')
        labels, self.label_to_city = self.warehoue_detector.get_label_and_name()
        len_label = int(len(labels) / 2)
        self.df_segmented['s_warehouse'] = labels[:len_label]
        self.df_segmented['e_warehouse'] = labels[len_label:]


    def _combine_traj(self):
        helper = TrajCombineHelper(self.label_to_city)
        for oid, group in self.df_segmented.groupby('oid'):
            df_g = group.sort_values(by='s_time')
            helper.clear_state()
            for idx, row in df_g.iterrows():
                s_w, e_w = row['s_warehouse'], row['e_warehouse']
                if s_w != -1 and e_w != -1:
                    helper.update_by_one_row(row, idx)
                    helper.clear_state()
                elif helper.cur_s_w is None:
                    if s_w != -1:  # Detected as warehouse
                        helper.add_partial_traj(row, idx)
                    else:
                        helper.clear_state()
                else:
                    if s_w != -1:
                        helper.clear_state()
                        helper.add_partial_traj(row, idx)
                    else:
                        if e_w != -1:
                            helper.finish_add_by_this_part(row, idx)
                        else:
                            helper.add_partial_traj(row, idx)

        self.df_combined = helper.to_DataFrame()

    def _od_info(self):
        self.df_combined['warehouse_od'] \
            = self.df_combined.apply(lambda df: df['start_warehoue'] + ':' + df['end_warehoue'], axis=1)
        self.df_combined['city_od'] \
            = self.df_combined.apply(lambda df: df['start_city'] + ':' + df['end_city'], axis=1)

    def vis_cluster(self):
        pass

    def get_OD_pairs(self, start_city, end_city):
        return OD(self.df_combined[(self.df_combined['start_city'] == start_city) & (self.df_combined['end_city'] == end_city)].copy(deep=True))

    def trip_distribution(self, level):
        if level == 'city':
            return self.df_combined.groupby('city_od').size()
        elif level == 'warehouse':
            return self.df_combined.groupby('warehouse_od').size()

    def to_csv(self):
        pass

    def save_combined_traj(self, path):
        self.df_combined.to_pickle(path)


class TrajCombineHelper(object):
    """Collect information and build combined trajectory dataframe for TrajCombiner.
    
        Used in iteration of _combine_traj of TrajCombiner.
    """
    def __init__(self, label_to_city):
        self.oids = []
        self.start_poses = []
        self.end_poss = []
        self.s_times = []
        self.e_times = []
        self.timestamps = []
        self.coords = []
        self.lengths = []
        self.start_citys = []
        self.end_citys = []
        self.start_warehouses = []
        self.end_warehouses = []
        self.origin_idxs = []
        self.label_to_city = label_to_city
        self.clear_state()
        self.remove_digits = str.maketrans('', '', digits)

    def clear_state(self):
        self.cur_length = 0
        self.cur_timestamp_list = []
        self.cur_coords_list = []
        self.cur_idx_list = []
        self.cur_s_w, self.cur_e_w = None, None

    def update_by_one_row(self, row, idx):
        oid, s_time, e_time, coords, timestamps, start_pos, end_pos, length, s_wh, e_wh, s_city, e_city, s_w, e_w = \
            self._row_info(row)
        self._update(oid, s_time, e_time, coords, timestamps, start_pos, end_pos, length, s_wh, e_wh, s_city, e_city, [idx])

    def add_partial_traj(self, row, idx):
        oid, s_time, e_time, coords, timestamps, start_pos, end_pos, length, s_wh, e_wh, s_city, e_city, s_w, e_w = \
            self._row_info(row)
        if self.cur_s_w is None:
            self.cur_s_w = s_w
        self.cur_idx_list.append(idx)
        self.cur_length += length
        self.cur_timestamp_list += timestamps
        self.cur_coords_list += coords

    def finish_add_by_this_part(self, row, idx):
        oid, s_time, e_time, coords, timestamps, start_pos, end_pos, length, s_wh, e_wh, s_city, e_city, s_w, e_w = \
            self._row_info(row)
        self.cur_length += length
        self.cur_timestamp_list += timestamps
        self.cur_coords_list += coords
        self.cur_idx_list.append(idx)
        s_wh = self.label_to_city[self.cur_s_w]
        s_city = s_wh.translate(self.remove_digits)  # remove the warehouse id
        self._update(oid, self.cur_timestamp_list[0], e_time, self.cur_coords_list, self.cur_timestamp_list, 
            self.cur_coords_list[0], end_pos, self.cur_length, s_wh, e_wh, s_city, e_city, self.cur_idx_list)
        self.clear_state()

    def to_DataFrame(self):
        return pd.DataFrame({'oid': self.oids, 's_time': self.s_times, 'e_time': self.e_times, 
                    'coords': self.coords, 'timestamps': self.timestamps, 'start_pos': self.start_poses,
                    'end_pos': self.end_poss, 'length': self.lengths, 'start_warehoue': self.start_warehouses,
                    'end_warehoue': self.end_warehouses, 'start_city': self.start_citys, 'end_city': self.end_citys,
                    'origin_idx': self.origin_idxs
                    })

    def _row_info(self, r):
        oid, s_time, e_time, coords, timestamps, start_pos, end_pos, length, s_w, e_w \
            = r['oid'], r['s_time'], r['e_time'], r['coords'], r['timestamps'], r['start_pos'], r['end_pos'], \
                r['length'], r['s_warehouse'], r['e_warehouse']
        if s_w != -1:
            s_wh = self.label_to_city[s_w]
            s_city = s_wh.translate(self.remove_digits)  # remove the warehouse id
        else:
            s_wh = 'other'
            s_city = 'other'
        if e_w != -1:
            e_wh = self.label_to_city[e_w]
            e_city = e_wh.translate(self.remove_digits)
        else:
            e_wh = 'other'
            e_city = 'other'
        return oid, s_time, e_time, coords, timestamps, start_pos, end_pos, length, s_wh, e_wh, s_city, e_city, s_w, e_w
    
    def _update(self, oid, s_time, e_time, coords, timestamps, start_pos, end_pos, length, s_wh, e_wh, s_city, e_city, idx_list):
        self.oids.append(oid)
        self.s_times.append(s_time)
        self.e_times.append(e_time)
        self.coords.append(coords)
        self.timestamps.append(timestamps)
        self.start_poses.append(start_pos)
        self.end_poss.append(end_pos)
        self.lengths.append(length)
        self.start_warehouses.append(s_wh)
        self.end_warehouses.append(e_wh)
        self.start_citys.append(s_city)
        self.end_citys.append(e_city)
        self.origin_idxs.append(idx_list)
        