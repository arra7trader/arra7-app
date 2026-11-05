"""Walk-forward smoke evaluation for the live ARRA Cronos predictor.

This script is a diagnostic, not a profitability test. It compares the model's
12-bar terminal close with a persistence baseline on separated historical windows.
Yahoo futures are reference feeds, not broker CFD prices.
"""

from __future__ import annotations

import argparse
import json
import math
import os

import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, median

import torch

from app import ForecastRequest, forecast, load_model


MARKETS = {
    "EURUSD": ("Yahoo Finance", "EURUSD=X", False),
    "GBPUSD": ("Yahoo Finance", "GBPUSD=X", False),
    "XAUUSD": ("Yahoo Finance futures reference", "GC=F", False),
    "XTIUSD": ("Yahoo Finance futures reference", "CL=F", False),
    "USTEC": ("Yahoo Finance futures reference", "NQ=F", False),
    "BTCUSD": ("Binance Spot", "BTCUSDT", True),
}
USER_AGENT = "Mozilla/5.0 PICA-ARRA-Cronos/1.0"
HORIZON = 12
EVALUATION_SEED = 20261105


def get_json(url: str) -> dict | list:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def fetch_yahoo(ticker: str) -> list[dict]:
    encoded = urllib.parse.quote(ticker, safe="")
    payload = get_json(
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        "?interval=60m&range=730d"
    )
    result = payload["chart"]["result"][0]
    quote = result["indicators"]["quote"][0]
    timestamps = result.get("timestamp", [])
    bars = []
    for index, timestamp in enumerate(timestamps):
        values = [
            quote.get(name, [None] * len(timestamps))[index]
            for name in ("open", "high", "low", "close")
        ]
        if any(value is None for value in values):
            continue
        open_price, high, low, close = map(float, values)
        volume = quote.get("volume", [0] * len(timestamps))[index] or 0
        if not all(math.isfinite(value) and value > 0 for value in values):
            continue
        if high < max(open_price, close, low) or low > min(open_price, close, high):
            continue
        bars.append(
            {
                "time": datetime.fromtimestamp(timestamp, timezone.utc).isoformat(),
                "open": open_price,
                "high": high,
                "low": low,
                "close": close,
                "volume": float(volume),
            }
        )
    return bars


def fetch_binance() -> list[dict]:
    last_error: Exception | None = None
    for host in ("api.binance.com", "data-api.binance.vision"):
        try:
            rows = get_json(
                f"https://{host}/api/v3/klines"
                "?symbol=BTCUSDT&interval=1h&limit=1000"
            )
            return [
                {
                    "time": datetime.fromtimestamp(
                        int(row[0]) / 1000, timezone.utc
                    ).isoformat(),
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4]),
                    "volume": float(row[5]),
                }
                for row in rows
            ]
        except Exception as error:  # noqa: BLE001 - report the provider failure
            last_error = error
    raise RuntimeError(f"Could not fetch Binance candles: {last_error}")


def evaluate_market(symbol: str, origins: int) -> dict:
    source, feed_symbol, continuous = MARKETS[symbol]
    candles = fetch_binance() if continuous else fetch_yahoo(feed_symbol)
    minimum_history = 512 + HORIZON + 1
    if len(candles) < minimum_history:
        raise RuntimeError(f"Only {len(candles)} valid hourly candles; need at least {minimum_history}")

    service_token = os.getenv("KRONOS_SERVICE_TOKEN")
    if not service_token:
        raise RuntimeError("Set KRONOS_SERVICE_TOKEN to a local-only test value first")

    first_origin = 512
    last_origin = len(candles) - HORIZON - 1
    positions = sorted(
        {
            round(first_origin + i * (last_origin - first_origin) / (origins - 1))
            for i in range(origins)
        }
    ) if origins > 1 else [last_origin]

    model_errors: list[float] = []
    naive_errors: list[float] = []
    direction_hits: list[bool] = []
    for origin_number, origin_index in enumerate(positions):
        history = candles[max(0, origin_index - 512) : origin_index]
        actual = candles[origin_index : origin_index + HORIZON]
        request_body = ForecastRequest.model_validate(
            {
                "symbol": symbol,
                "timeframe": "1h",
                "pred_len": HORIZON,
                "interval_seconds": 3_600,
                "continuous_market": continuous,
                "candles": history,
                "future_times": [bar["time"] for bar in actual],
            }
        )
        seed = EVALUATION_SEED + origin_number
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
        prediction = forecast(request_body, service_token)
        if not isinstance(prediction, dict) or "forecast" not in prediction:
            raise RuntimeError(f"Kronos rejected {symbol} at origin {origin_index}")

        start_price = history[-1]["close"]
        target_price = actual[-1]["close"]
        predicted_price = prediction["forecast"][-1]["close"]
        model_errors.append(abs(predicted_price - target_price) / start_price * 100)
        naive_errors.append(abs(start_price - target_price) / start_price * 100)
        predicted_direction = (predicted_price > start_price) - (predicted_price < start_price)
        actual_direction = (target_price > start_price) - (target_price < start_price)
        direction_hits.append(predicted_direction == actual_direction)

    model_mean = mean(model_errors)
    naive_mean = mean(naive_errors)
    return {
        "symbol": symbol,
        "source": source,
        "feed": feed_symbol,
        "historyBars": len(candles),
        "horizonBars": HORIZON,
        "samplingSeedBase": EVALUATION_SEED,
        "walkForwardOrigins": len(positions),
        "modelMeanTerminalAbsErrorPct": round(model_mean, 4),
        "modelMedianTerminalAbsErrorPct": round(median(model_errors), 4),
        "persistenceMeanTerminalAbsErrorPct": round(naive_mean, 4),
        "directionAccuracyPct": round(mean(direction_hits) * 100, 1),
        "modelBeatsPersistence": sum(
            model_error < naive_error
            for model_error, naive_error in zip(model_errors, naive_errors)
        ),
        "meanErrorImprovementVsPersistencePct": round(
            (naive_mean - model_mean) / naive_mean * 100, 2
        ) if naive_mean else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origins", type=int, default=8, help="Separated historical windows per market")
    parser.add_argument("--symbols", nargs="+", choices=sorted(MARKETS), default=sorted(MARKETS))
    parser.add_argument("--output", help="Write the diagnostic JSON report to a file")
    args = parser.parse_args()
    if not 1 <= args.origins <= 64:
        parser.error("--origins must be between 1 and 64")

    load_model()
    from app import predictor

    if predictor is None:
        raise RuntimeError("Kronos did not load; check the service logs and model cache")

    results = []
    for symbol in args.symbols:
        try:
            results.append(evaluate_market(symbol, args.origins))
        except Exception as error:  # noqa: BLE001 - continue other markets
            results.append({"symbol": symbol, "error": f"{type(error).__name__}: {error}"})
    rendered = json.dumps({
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "evaluation": "walk-forward smoke check; not a profitability claim",
        "model": "Kronos-mini, upstream predictor average of five sampled paths",
        "timeframe": "1h",
        "markets": results,
    }, indent=2)
    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
        print(f"Saved report: {output}")
    else:
        print(rendered)


if __name__ == "__main__":
    main()
