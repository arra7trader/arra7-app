"""ARRA Cronos inference service using the upstream Kronos PyTorch model."""

import os
import time
import logging
import threading
from datetime import timedelta
from typing import Literal

import pandas as pd
import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model import Kronos, KronosPredictor, KronosTokenizer


MODEL_ID = os.getenv("KRONOS_MODEL_ID", "NeoQuasar/Kronos-base")
TOKENIZER_ID = os.getenv("KRONOS_TOKENIZER_ID", "NeoQuasar/Kronos-Tokenizer-base")
MODEL_REVISION = os.getenv("KRONOS_MODEL_REVISION", "main")
TOKENIZER_REVISION = os.getenv("KRONOS_TOKENIZER_REVISION", "main")
SERVICE_TOKEN = os.getenv("KRONOS_SERVICE_TOKEN")
MAX_CONTEXT = max(1, min(int(os.getenv("KRONOS_MAX_CONTEXT", "512")), 2048))

app = FastAPI(title="ARRA Cronos inference", version="1.1.0")

# Enable CORS for direct front-end communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor: KronosPredictor | None = None
device_name = "cpu"
inference_lock = threading.Lock()


class Candle(BaseModel):
    time: str
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    volume: float = Field(ge=0)


class ForecastRequest(BaseModel):
    symbol: str = Field(min_length=3, max_length=20)
    timeframe: Literal["15m", "1h", "4h", "1d"]
    pred_len: int = Field(ge=1, le=24)
    interval_seconds: int = Field(gt=0, le=86_400)
    continuous_market: bool = False
    candles: list[Candle] = Field(min_length=20, max_length=512)


@app.on_event("startup")
def load_model() -> None:
    global predictor, device_name
    device_name = "cuda:0" if torch.cuda.is_available() else "cpu"
    try:
        logging.info("Loading tokenizer %s and model %s onto %s...", TOKENIZER_ID, MODEL_ID, device_name)
        tokenizer = KronosTokenizer.from_pretrained(TOKENIZER_ID, revision=TOKENIZER_REVISION)
        model = Kronos.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
        predictor = KronosPredictor(model, tokenizer, device=device_name, max_context=MAX_CONTEXT)
        predictor.model.eval()
        logging.info("Kronos model successfully loaded onto %s!", device_name)
    except Exception as error:
        predictor = None
        logging.exception("Kronos weights could not be loaded: %s", error)


@app.get("/health")
def health() -> dict:
    cuda_info = {}
    if torch.cuda.is_available():
        cuda_info = {
            "device_name": torch.cuda.get_device_name(0),
            "memory_allocated_mb": round(torch.cuda.memory_allocated(0) / 1024**2, 1),
            "memory_reserved_mb": round(torch.cuda.memory_reserved(0) / 1024**2, 1),
        }
    return {
        "status": "online" if predictor is not None else "offline",
        "model_loaded": predictor is not None,
        "model_name": MODEL_ID,
        "tokenizer_name": TOKENIZER_ID,
        "device": device_name,
        "cuda": cuda_info,
        "max_context": MAX_CONTEXT,
    }


@app.post("/forecast")
def forecast(body: ForecastRequest, x_service_token: str | None = Header(default=None)) -> dict:
    if SERVICE_TOKEN and x_service_token != SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid service token")
    if predictor is None:
        raise HTTPException(status_code=503, detail="Kronos model is unavailable")

    frame = pd.DataFrame([candle.model_dump() for candle in body.candles])
    frame["time"] = pd.to_datetime(frame["time"], utc=True, errors="coerce")
    frame = frame.dropna(subset=["time"]).sort_values("time").drop_duplicates("time")
    if len(frame) < 20:
        raise HTTPException(status_code=422, detail="At least 20 unique, timestamped candles are required")
    if len(frame) > MAX_CONTEXT:
        frame = frame.iloc[-MAX_CONTEXT:].reset_index(drop=True)

    x_timestamps = frame["time"].reset_index(drop=True)
    last_time = x_timestamps.iloc[-1]
    interval = timedelta(seconds=body.interval_seconds)
    future_times = []
    next_time = last_time
    while len(future_times) < body.pred_len:
        next_time += interval
        if not body.continuous_market:
            while next_time.weekday() >= 5:
                next_time += timedelta(days=1)
        future_times.append(next_time)
    y_timestamps = pd.Series(future_times)
    model_input = frame[["open", "high", "low", "close", "volume"]].reset_index(drop=True)

    # Estimate ATR for volatility corridor
    atr = float((frame["high"].tail(14) - frame["low"].tail(14)).mean()) if len(frame) >= 14 else float(frame.iloc[-1]["close"] * 0.005)

    started = time.perf_counter()
    with inference_lock, torch.inference_mode():
        predictions = predictor.predict(
            df=model_input,
            x_timestamp=x_timestamps,
            y_timestamp=y_timestamps,
            pred_len=body.pred_len,
            T=1.0,
            top_p=0.9,
            sample_count=5,
            verbose=False,
        )
    elapsed_ms = round((time.perf_counter() - started) * 1000, 1)

    path = []
    step_idx = 1
    for timestamp, row in predictions.iterrows():
        values = [float(row[column]) for column in ("open", "high", "low", "close", "volume")]
        open_price, high, low, close, volume = values
        if not all(torch.isfinite(torch.tensor(value)).item() for value in values):
            raise HTTPException(status_code=502, detail="Kronos returned a non-finite forecast")
        high = max(high, open_price, close)
        low = min(low, open_price, close)

        # Quantile dispersion corridor
        dispersion = atr * (step_idx ** 0.5) * 0.48
        upper = round(close + dispersion, 5)
        lower = round(close - dispersion, 5)

        path.append({
            "time": timestamp.isoformat(),
            "open": round(open_price, 5),
            "high": round(high, 5),
            "low": round(low, 5),
            "close": round(close, 5),
            "volume": max(0.0, volume),
            "upper": upper,
            "lower": lower,
        })
        step_idx += 1

    if not path:
        raise HTTPException(status_code=502, detail="Kronos returned an empty forecast")

    current_price = float(frame.iloc[-1]["close"])
    target_price = path[-1]["close"]
    return {
        "symbol": body.symbol,
        "timeframe": body.timeframe,
        "model": MODEL_ID,
        "modelSource": f"NeoQuasar Kronos-base ({device_name})",
        "currentPrice": current_price,
        "targetPrice": target_price,
        "direction": "UP" if target_price > current_price else "DOWN" if target_price < current_price else "FLAT",
        "forecast": path,
        "historyBars": len(frame),
        "inferenceMs": elapsed_ms,
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "method": "Kronos OHLCV forecast averaged from 5 sampled paths by upstream predictor with volatility corridor",
    }
