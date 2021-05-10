import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree
import geopy.distance
from .cluster_set import ClusterSet
from .node_set import NodeSet
from .utils import parse_position
from sklearn.cluster import DBSCAN
import folium


def plot_toll_with_neareast_intersection_node(node_set, toll_set, 
    irange=None, show_distances=False, show_connect_line=False):
    m = folium.Map(location=node_set[0].get_coord(False), zoom_start=12)
    if irange is None:
        irange = np.arange(len(node_set))
    
    for idx in irange:
        nodes = node_set[idx]
        toll_coord, toll_name = toll_set[idx]
        folium.Marker(toll_coord, icon=folium.map.Icon(color='orange'), popup=toll_name).add_to(m)
        if not isinstance(nodes, list):  # Support k >= 1
            nodes = [nodes]
        for node in nodes:
            node_coord = node.get_coord(False)
            node_info = node.connection_type + ':%d intersections. ' % node.connected_road_num
            if show_distances:
                node_info += ('distance to toll %.2f' % node.distance_to_coord(toll_coord))
            folium.Marker(node_coord, icon=folium.map.Icon(color='blue'), popup=node_info).add_to(m)
        if show_connect_line:
            folium.PolyLine(locations=[toll_coord, node_coord]).add_to(m)

    return m


class POITolls(ClusterSet):

    def __init__(self, poi_toll_path, highway_intersection_node_set=None, mortorway_nodes_coords=None, 
        build_toll_tree=False):
        """Class of Tolls
        
        Args:
            poi_toll_path: str, downloaded from JUST
            highway_intersection_node_set: If None, it's for toll analysis, if not, it will
            probably find all the real toll position within given data.
            mortorway_nodes_coords: 
        """
        self.df_toll = pd.read_csv(poi_toll_path, sep='|', converters={'position': parse_position})

        self.toll_coords_list = []
        self.toll_coords_name = []
        self.class_of_each_toll = []
        self.toll_class_to_idx = {}
        if highway_intersection_node_set is not None:
            filtered_coords, filtered_coords_idx_in_df = self._init_coords_and_filter_abnormal_toll(highway_intersection_node_set)
            print('Number of filtered coords at first round', len(filtered_coords))
            readded_coords, readded_coords_name = self._refilter_the_toll(filtered_coords, filtered_coords_idx_in_df, mortorway_nodes_coords)
            self.readded_coords = readded_coords
            print('Number of readded coords:',len(readded_coords))
            self.toll_coords_list += readded_coords
            self.toll_coords_name += readded_coords_name
            self._group_adjecent_toll()
            if build_toll_tree:
                self._init_toll_coords_tree()
            
    def _init_coords_and_filter_abnormal_toll(self, highway_intersection_node_set, dis_threshold=850):
        self.toll_coords_list = highway_intersection_node_set.coords(False)  # First part of toll coords, which is road intersection
        self.toll_coords_name = ['unknow' for i in range(len(self.toll_coords_list))]
        indexs, distances_to_neareast_node = self.nearest_nodes(highway_intersection_node_set, 1, True, True)

        toll_data_coords = self.get_coords() # coords in given file, not from road network
        filtered_coords = []
        filtered_coords_idx_in_df = []
        i = 0
        for idx, dis in zip(indexs, distances_to_neareast_node):
            if dis < dis_threshold:
                self.toll_coords_name[idx] = self.df_toll.loc[i, 'poi_name']
            else:
                filtered_coords.append(toll_data_coords[i])
                filtered_coords_idx_in_df.append(i)
            i += 1
        return filtered_coords, filtered_coords_idx_in_df

    def _refilter_the_toll(self, filtered_coords, filtered_coords_idx_in_df, mortorway_nodes_coords):
        readded_coords = []
        readded_coords_name = []

        motorway_tree = BallTree(np.array(mortorway_nodes_coords), leaf_size=20, metric='haversine')
        indexs = motorway_tree.query(filtered_coords, k=1, return_distance=False)
        indexs = [i for row in indexs for i in row]

        for mortorway_coord_idx, refiltering_coord, refiltering_coord_idx_in_df in zip(indexs, filtered_coords, filtered_coords_idx_in_df):
            neareast_motorway_coord = mortorway_nodes_coords[mortorway_coord_idx]
            distances_to_neareast_node = geopy.distance.distance(neareast_motorway_coord, refiltering_coord).meters
            if distances_to_neareast_node < 200:
                readded_coords.append(refiltering_coord)
                readded_coords_name.append(self.df_toll.loc[refiltering_coord_idx_in_df, 'poi_name'])

        return readded_coords, readded_coords_name

    def _group_adjecent_toll(self):
        """Group adjecent tolls into one class"""
        dbscan = DBSCAN(eps=0.002, min_samples=2, 
            metric='haversine', algorithm='ball_tree', leaf_size=5).fit(self.toll_coords_list)
        labels = dbscan.labels_
        self.class_of_each_toll = labels
        class_id = len(set(labels)) - 1  # noise point is labeled -1
        self.grouped_class_num = class_id
        # fill self.toll_class_to_idx with grouped idx
        for c in range(class_id):
            self.toll_class_to_idx[c] = list(np.where(labels == c))
        # Each noise point will have it's own class
        for i in range(len(self.class_of_each_toll)):
            if self.class_of_each_toll[i] == -1:
                self.class_of_each_toll[i] = class_id
                self.toll_class_to_idx[class_id] = [i]
                class_id += 1
    
    def _init_toll_coords_tree(self):
        self.toll_tree = BallTree(np.array(self.toll_coords_list), leaf_size=20, metric='haversine')

    def visualize_tolls(self, idx_range=None, diff_grouped=False):
        """Visualize the tolls on folium map
        
        Args:
            limits: int, number of shown tolls
            diff_grouped: bool, if True, grouped toll will be shown in different color
        """
        if idx_range is None:
            idx_range = np.arange(len(self.toll_coords_list))
        m = folium.Map(self.toll_coords_list[0], zoom_start=12)
        for i in idx_range:
            if diff_grouped and self.class_of_each_toll[i] < self.grouped_class_num:  # have adjecent tolls
                color = 'orange'
            else:
                color = 'blue'
            popup_str = 'poi class: ' + str(self.class_of_each_toll[i]) + ', origin idx:' + str(i)
            folium.Marker(self.toll_coords_list[i], icon=folium.Icon(color=color), popup=popup_str).add_to(m)
        return m

    def nearest_nodes(self, node_set, k, return_distance=False, return_origin_indx=False):
        """Find the neareast nodes of each given POI_Toll

        Args:
            node_set: NodeSet object
            k: k neareast nodes  # TODO: doesn't support k > 1 for now. -> No need to support k>1
            with_distance: whether return the distacne between Toll and it's neareast node.
        Returns:
            neareaset_node_set: NodeSet, in order to analyse neareast node attributes
            distances_to_neareast_node: if return_distance == True, return the distances 
        """
        assert k >= 1, 'k is not set properly'
        toll_coords = np.array(self.get_coords())  # lat, lon
        node_coords = np.array(node_set.coords(lon_first=False))
        ball_tree = BallTree(node_coords, leaf_size=20, metric='haversine')
        indexs = ball_tree.query(toll_coords, k, return_distance=False)

        neareaset_node_list = [[node_set[i] for i in row] for row in indexs] 
        if k == 1:
            neareaset_node_list = [n for row in neareaset_node_list for n in row]  # k == 1 then flatten
        neareaset_node_set = NodeSet(neareaset_node_list)
        
        if return_distance:
            if k == 1:
                distances_to_neareast_node = [n.distance_to_coord(tc) for n, tc in zip(neareaset_node_list, toll_coords)]
            else:
                distances_to_neareast_node = None
            if not return_origin_indx:
                return neareaset_node_set, distances_to_neareast_node
            else:
                return [i for row in indexs for i in row], distances_to_neareast_node
        else:
            return neareaset_node_set

    def neareast_tolls_of_coords(self, coords):
        dises, idxs = self.toll_tree.query(coords, k=1, return_distance=True)
        idxs = [i for row in idxs for i in row]
        dises = [d for row in dises for d in row]
        nearest_toll_idx = idxs[np.argmin(dises)]
        return self.class_of_each_toll[nearest_toll_idx], self.toll_coords_list[nearest_toll_idx]

    def get_coords(self):
        """coords of each toll, [lat, lon],!!Attention!!: old version api, abandoned"""
        return [coord for coord in self.df_toll['position'].values]

    def dis_of_two_toll(self, idx1, idx2):
        """Used for debug"""
        return geopy.distance.distance(self.toll_coords_list[idx1], self.toll_coords_list[idx2]).meters

    def __getitem__(self, idx):
        return self.toll_coords_list[idx], self.toll_coords_name[idx]

    def get_coords_of_class(self, class_id):
        toll_idxs = self.toll_class_to_idx[class_id][0]
        if isinstance(toll_idxs, np.ndarray):
            return [self.toll_coords_list[i] for i in toll_idxs]
        else:
            print(toll_idxs)
            return [self.toll_coords_list[toll_idxs]]
    
    def to_csv(self, path):
        with open(path, 'w') as f:
            out = ''
            for c in self.toll_coords_list:
                out += (str(c[0]) + ',' + str(c[1]) + '\n')
            f.write(out)
