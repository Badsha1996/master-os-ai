from itertools import islice
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
from utility.state import search_state

'''
Router and Endpoints 
'''
file_router = APIRouter(prefix="/file", tags=["filesystem"])

@file_router.post("/search")
def search_files(file_name: str) -> JSONResponse:
    if not file_name:
        return JSONResponse(content={"files": []})

    query = file_name.lower()
    
    matches_iterator = (
        path for path in search_state.FILE_INDEX 
        if query in os.path.basename(path).lower()
    )

    limited_results = list(islice(matches_iterator, 50))

    return JSONResponse(content={
        "files": limited_results, 
        "total_indexed": len(search_state.FILE_INDEX),
        "indexing_status": "Indexing..." if search_state.IS_INDEXING else "Ready"
    })