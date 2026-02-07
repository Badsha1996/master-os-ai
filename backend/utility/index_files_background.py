import os
import psutil
import sqlite3
from database.init import get_connection

# Configuration
BATCH_SIZE = 50000  
SYSTEM_DIRS = {'Windows', '$Recycle.Bin', 'System Volume Information', 'Program Files', 'Program Files (x86)', 'AppData'}

def index_files_background():
    conn = get_connection()
    
    conn.execute("INSERT OR REPLACE INTO system_state (key, value) VALUES ('indexing_status', 'Indexing...')")
    conn.commit()

    try:
        conn.execute("DELETE FROM file_index")
        conn.commit()

        drives = [d.mountpoint for d in psutil.disk_partitions() if d.fstype]
        
        batch = []
        
        for drive in drives:
            for root, dirs, files in os.walk(drive, topdown=True, onerror=None):
                
                # 1. SMART FILTERING
                dirs[:] = [d for d in dirs if d not in SYSTEM_DIRS and not d.startswith('.')]

                # 2. ACCUMULATE FILES
                for name in files:
                    full_path = os.path.join(root, name)
                    batch.append((full_path, name))
                    
                    # 3. BATCH INSERT
                    if len(batch) >= BATCH_SIZE:
                        _flush_batch(conn, batch)
                        batch.clear()

                for name in dirs:
                     full_path = os.path.join(root, name)
                     batch.append((full_path, name))

        if batch:
            _flush_batch(conn, batch)

    except Exception as e:
        print(f"Indexing Error: {e}")
    finally:
        conn.execute("INSERT OR REPLACE INTO system_state (key, value) VALUES ('indexing_status', 'Ready')")
        conn.commit()
        
        # Optimize the B-Tree structure after a massive insert
        conn.execute("INSERT INTO file_index(file_index) VALUES('optimize');")
        conn.commit()
        conn.close()

def _flush_batch(conn, batch):
    try:
        conn.executemany(
            "INSERT INTO file_index (path, filename) VALUES (?, ?)", 
            batch
        )
        conn.commit() 
    except sqlite3.Error as e:
        print(f"Batch insert error: {e}")