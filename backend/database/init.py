import sqlite3
from pathlib import Path
import os
import sys

APP_NAME = "MOS"

def get_db_path() -> Path:
    if sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    elif os.name == "nt":
        base = Path(os.environ["APPDATA"])
    else:
        base = Path.home() / ".local" / "share"

    path = base / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path / "mos.db"

def get_connection():
    conn = sqlite3.connect(
        get_db_path(),
        timeout=10,
        check_same_thread=False
    )
   
    conn.execute("PRAGMA journal_mode=WAL;")  
    conn.execute("PRAGMA synchronous=NORMAL;") 
    conn.execute("PRAGMA cache_size=-64000;") # Use 64MB of RAM for cache
    conn.execute("PRAGMA mmap_size=268435456;") # Memory map 256MB for ultra-fast reads
    conn.execute("PRAGMA temp_store=MEMORY;") # Store temp tables in RAM
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS system_state (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        
        try:
            conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS file_index 
                USING fts5(path, filename, tokenize='trigram');
            """)
        except sqlite3.OperationalError:
            conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS file_index 
                USING fts5(path, filename, tokenize='unicode61');
            """)
            
        conn.commit()
    finally:
        conn.close()

init_db()