import os
import psutil
from .state import search_state

def index_files_background():
    search_state.IS_INDEXING = True

    drives = [d.mountpoint for d in psutil.disk_partitions() if d.fstype]
    local_index = []
    
    for drive in drives:
        for root, dirs, files in os.walk(drive, topdown=True, onerror=None):
            if drive == "C:\\":
                dirs[:] = [d for d in dirs if d not in ['Windows', '$Recycle.Bin', 'System Volume Information']]

            for name in dirs:
                local_index.append(os.path.join(root, name))
            for name in files:
                local_index.append(os.path.join(root, name))
            
            if len(local_index) % 10000 == 0:
                search_state.FILE_INDEX = list(local_index)
            
    search_state.FILE_INDEX = local_index
    search_state.IS_INDEXING = False