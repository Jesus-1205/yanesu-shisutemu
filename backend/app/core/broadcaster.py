import asyncio
import json
from typing import Any


class Broadcaster:
    def __init__(self) -> None:
        self._queues: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def _get_or_set_loop(self) -> asyncio.AbstractEventLoop | None:
        try:
            loop = asyncio.get_running_loop()
            self._loop = loop
            return loop
        except RuntimeError:
            return self._loop

    async def subscribe(self) -> asyncio.Queue:
        self._get_or_set_loop()
        q: asyncio.Queue = asyncio.Queue()
        self._queues.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._queues.discard(q)

    def publish(self, data: dict[str, Any]) -> None:
        payload = json.dumps(data)
        message = f"data: {payload}\n\n"
        loop = self._loop
        for q in list(self._queues):
            try:
                if loop and loop.is_running():
                    loop.call_soon_threadsafe(q.put_nowait, message)
                else:
                    q.put_nowait(message)
            except Exception:
                pass


rate_broadcaster = Broadcaster()
