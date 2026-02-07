from fastapi import APIRouter
from fastapi.responses import JSONResponse
import sqlite3
from database.init import get_connection

file_router = APIRouter(prefix="/file", tags=["filesystem"])


# FTS5 stretegy 
@file_router.post("/search")
def search_files(file_name: str) -> JSONResponse:
    if not file_name:
        return JSONResponse(content={"files": []})

    conn = get_connection()
    try:
        safe_query = file_name.replace('"', '""') 
        
        cursor = conn.execute("""
            SELECT path 
            FROM file_index 
            WHERE filename MATCH ? 
            ORDER BY rank 
            LIMIT 50
        """, (f'"{safe_query}"',))

        results = [row["path"] for row in cursor.fetchall()]

        count_cursor = conn.execute("SELECT count(*) as cnt FROM file_index")
        total_indexed = count_cursor.fetchone()["cnt"]

        status_cursor = conn.execute("SELECT value FROM system_state WHERE key='indexing_status'")
        status_row = status_cursor.fetchone()
        status = status_row["value"] if status_row else "Ready"

        return JSONResponse(content={
            "files": results,
            "total_indexed": total_indexed,
            "indexing_status": status
        })
        
    except sqlite3.Error as e:
        return JSONResponse(content={"files": [], "error": "Search failed"}, status_code=500)
    finally:
        conn.close()