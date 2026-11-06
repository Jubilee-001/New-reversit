"""A small in-process, per-IP rate limiter.

This is deliberately simple: a single process, a fixed window and a bounded
dictionary. It is not a substitute for a shared limiter when the app runs on
more than one worker, but it protects the free Groq tier in the default
single-process deployment. No request content is recorded.
"""

from __future__ import annotations

import threading
import time


class RateLimiter:
    def __init__(self, limit: int = 10, window_seconds: int = 60, max_keys: int = 10_000):
        self.limit = limit
        self.window_seconds = window_seconds
        self.max_keys = max_keys
        self._hits: dict[str, tuple[int, float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            if len(self._hits) > self.max_keys:
                self._prune(now)
            count, started = self._hits.get(key, (0, now))
            if now - started >= self.window_seconds:
                count, started = 0, now
            count += 1
            self._hits[key] = (count, started)
            return count <= self.limit

    def _prune(self, now: float) -> None:
        expired = [
            key
            for key, (_, started) in self._hits.items()
            if now - started >= self.window_seconds
        ]
        for key in expired:
            del self._hits[key]
        if len(self._hits) > self.max_keys:
            self._hits.clear()


parse_limiter = RateLimiter()
image_limiter = RateLimiter()
