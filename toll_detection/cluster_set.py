import numpy as np



class ClusterSet(object):
    """Coords set that need to fix some subsets in which each points are too each other."""
    def __init__(self):
        self.items = None

    def fix_position(self):
        pass

    def __getitem__(self, key):
        return self.items[key]