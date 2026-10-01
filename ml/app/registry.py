import json
from functools import lru_cache

import joblib

from app.config import META_PATH, MODEL_PATH
from app.train import train_and_save


class Registry:
    def __init__(self) -> None:
        self.bundle = None
        self.meta = None

    def load(self) -> None:
        if not MODEL_PATH.exists() or not META_PATH.exists():
            train_and_save()
        self.bundle = joblib.load(MODEL_PATH)
        self.meta = json.loads(META_PATH.read_text(encoding="utf-8"))

    def ready(self) -> bool:
        return self.bundle is not None and self.meta is not None


registry = Registry()


@lru_cache(maxsize=1)
def get_registry() -> Registry:
    registry.load()
    return registry
