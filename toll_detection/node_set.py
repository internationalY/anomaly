"""Analysis attributes of Road Nodes set aggregated by some rules"""
from .road_node import RoadNode
from .cluster_set import ClusterSet
import collections
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

class NodeSet(ClusterSet):
    def __init__(self, road_nodes):
        self.road_nodes = road_nodes  # order of the node matters
        self.items = road_nodes

    def coords(self, lon_first):
        return [n.get_coord(lon_first) for n in self.road_nodes]

    def road_types(self):
        return [n.connection_type for n in self.road_nodes]

    def road_lens(self):
        return [n.connected_road_num for n in self.road_nodes]
    
    def __getitem___(self, idx):
        return self.road_nodes[idx]

    def __len__(self):
        return len(self.road_nodes)
    
    def plot_type_distribution(self):
        """plot type distribution in pie chart.
        
        However, there is too much types, pie chart is not suitable.
        """
        
        label_list, ratio_list = self._type_distribution()
        idx_sort = np.argsort(label_list)

        label_list = label_list[idx_sort]
        ratio_list = ratio_list[idx_sort]

        fig, ax = plt.subplots()
        ax.pie(ratio_list, labels=label_list, autopct='%1.1f%%')
        ax.axis('equal')
        plt.show()
    
    def get_type_distribution_df(self):
        label_list, ratio_list = self._type_distribution()
        
        df = pd.DataFrame({'Ratio':ratio_list}, index=label_list)
        return df

    def _type_distribution(self):
        road_types = self.road_types()
        counter = collections.Counter(road_types)
        label_list = np.array(list(counter.keys()))
        ratio_list = np.array(list(counter.values()))
        ratio_list = (ratio_list / np.sum(ratio_list)) * 100
        return label_list, ratio_list

    def get_subset_with_specified_type(self, wanted_type_list):
        node_list = []
        for node in self.road_nodes:
            node_types = node.connection_type.split('+')
            for node_type in node_types:
                if node_type in wanted_type_list:
                    node_list.append(node)
                    break
        return NodeSet(node_list)

    def get_subset_not_contain_specified_type(self, unwanted_type_list):
        """Used only for test."""
        node_list = []
        for node in self.road_nodes:
            node_types = node.connection_type.split('+')
            count = 0
            for node_type in node_types:
                if node_type in unwanted_type_list:
                    break
                count += 1
            if count == len(node_types):
                node_list.append(node)
        return NodeSet(node_list)

    def sub_set(self, idxs):
        return NodeSet([self.road_nodes[i] for i in idxs])