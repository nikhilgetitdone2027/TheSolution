import math
from typing import Any

import numpy as np


def finite_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def rounded(value: Any, digits: int = 2) -> float | None:
    number = finite_float(value)
    if number is None:
        return None
    return round(number, digits)


def jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    if isinstance(value, np.ndarray):
        return jsonable(value.tolist())
    if isinstance(value, (np.floating, float)):
        return rounded(value, 6)
    if isinstance(value, (np.integer, int)) and not isinstance(value, bool):
        return int(value)
    return value
