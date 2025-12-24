from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

import threading
import time
import os
from typing import Dict, List
import uuid

'''
Req and Res models
'''
class FolderRequest(BaseModel):
    path: str

class FileEvent(BaseModel):
    event_type: str
    path: str
    timestamp: float

'''
Event Handler 
'''
class WatchHandler(FileSystemEventHandler):
    def __init__(self, events: List[FileEvent], lock: threading.Lock) -> None:
        self._events = events
        self._lock = lock

    def _add_event(self, event_type: str, path: str) -> None:
        with self._lock:
            self._events.append(
                FileEvent(
                    event_type=event_type,
                    path=path,
                    timestamp=time.time()
                )
            )
            # Keep last 20 events
            del self._events[:-20]

    def on_created(self, event: FileSystemEvent) -> None:
        self._add_event("created", str(event.src_path))

    def on_deleted(self, event: FileSystemEvent) -> None:
        self._add_event("deleted", str(event.src_path))

    def on_modified(self, event: FileSystemEvent) -> None:
        self._add_event("modified", str(event.src_path))

    def on_moved(self, event: FileSystemEvent) -> None:
        self._add_event("moved", f"{event.src_path} -> {event.dest_path}")


'''
File System
'''
class FileSystemWatcher:
    def __init__(self, path: str) -> None:
        self.id = str(uuid.uuid4())
        self.path = path
        self.events: List[FileEvent] = []
        self.lock = threading.Lock()

        self.observer = Observer()
        self.handler = WatchHandler(self.events, self.lock)

    def start(self) -> None:
        self.observer.schedule(self.handler, self.path, recursive=True)
        self.observer.start()

    def stop(self) -> None:
        self.observer.stop()
        self.observer.join()

    def get_events(self) -> List[FileEvent]:
        with self.lock:
            return list(self.events)

'''
Multi folder handle 
'''
class WatcherManager:
    def __init__(self):
        self._watchers: Dict[str, FileSystemWatcher] = {}
        self._lock = threading.Lock()

    def start_watcher(self, path: str) -> str:
        if not os.path.isdir(path):
            raise HTTPException(status_code=400, detail="Invalid directory path")

        watcher = FileSystemWatcher(path)
        watcher.start()

        with self._lock:
            self._watchers[watcher.id] = watcher

        return watcher.id

    def stop_watcher(self, watcher_id: str) -> None:
        with self._lock:
            watcher = self._watchers.pop(watcher_id, None)

        if not watcher:
            raise HTTPException(status_code=404, detail="Watcher not found")

        watcher.stop()

    def get_events(self, watcher_id: str) -> List[FileEvent]:
        watcher = self._watchers.get(watcher_id)
        if not watcher:
            raise HTTPException(status_code=404, detail="Watcher not found")

        return watcher.get_events()

'''
Router and Endpoints 
'''
file_router = APIRouter(prefix="/file", tags=["filesystem"])
manager = WatcherManager()


@file_router.post("/observe/start")
def start_watching(req: FolderRequest) -> JSONResponse:
    watcher_id = manager.start_watcher(req.path)
    return JSONResponse(
        status_code=200,
        content={
            "status": "watching started",
            "watcher_id": watcher_id,
            "folder": req.path
        }
    )


@file_router.post("/observe/{watcher_id}/stop")
def stop_watching(watcher_id: str) -> JSONResponse:
    manager.stop_watcher(watcher_id)
    return JSONResponse(content={"status": "watching stopped"})


@file_router.get("/observe/{watcher_id}/events")
def get_events(watcher_id: str) -> JSONResponse:
    events = manager.get_events(watcher_id)
    return JSONResponse(content={"events": [e.model_dump() for e in events]})

