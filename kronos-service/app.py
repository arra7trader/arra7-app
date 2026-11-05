"""ARRA Cronos inference service using the upstream Kronos PyTorch model."""

import os
import time
import logging
import threading
import hmac
import math
from datetime import timedelta
from typing import Literal

import pandas as pd
import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import AwareDatetime, BaseModel, Field, model_validator

from model import Kronos, KronosPredictor, KronosTokenizer


MODEL_ID = os.getenv("KRONOS_MODEL_ID", "NeoQuasar/Kronos-mini")
TOKENIZER_ID = os.getenv("KRONOS_TOKENIZER_ID", "NeoQuasar/Kronos-Tokenizer-2k")
MODEL_REVISION = os.getenv("KRONOS_MODEL_REVISION", "f4e68697d9d5aed55cef5c96aabc3376bcad9f81")
TOKENIZER_REVISION = os.getenv("KRONOS_TOKENIZER_REVISION", "26966d0035065a0cae0ebad7af8ece35bc1fb51c")
SERVICE_TOKEN = os.getenv("KRONOS_SERVICE_TOKEN")
MAX_CONTEXT = max(1, min(int(os.getenv("KRONOS_MAX_CONTEXT", "512")), 2048))

app = FastAPI(title="ARRA Cronos inference", version="1.0.0")
predictor: KronosPredictor | None = None
device_name = "cpu"
inference_lock = threading.Lock()


class Candle(BaseModel):
    time: str
    open: float = Field(gt=0, allow_inf_nan=False)
    high: float = Field(gt=0, allow_inf_nan=False)
    low: float = Field(gt=0, allow_inf_nan=False)
    close: float = Field(gt=0, allow_inf_nan=False)
    volume: float = Field(ge=0, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_ohlc(self) -> "Candle":
        if self.high < max(self.open, self.close, self.low):
            raise ValueError("high must be at least the open, close, and low")
        if self.low > min(self.open, self.close, self.high):
            raise ValueError("low must be at most the open, close, and high")
        return self


class ForecastRequest(BaseModel):
    symbol: str = Field(min_length=3, max_length=20)
    timeframe: Literal["15m", "1h", "4h", "1d"]
    pred_len: int = Field(ge=1, le=24)
    interval_seconds: int = Field(gt=0, le=86_400)
    continuous_market: bool = False
    candles: list[Candle] = Field(min_length=20, max_length=512)
    future_times: list[AwareDatetime] | None = None

    @model_validator(mode="after")
    def validate_future_times(self) -> "ForecastRequest":
        if self.future_times is not None:
            if len(self.future_times) != self.pred_len:
                raise ValueError("future_times must contain exactly pred_len timestamps")
            if any(current <= previous for previous, current in zip(self.future_times, self.future_times[1:])):
                raise ValueError("future_times must be strictly increasing")
        return self


@app.on_event("startup")
def load_model() -> None:
    global predictor, device_name
    device_name = "cuda:0" if torch.cuda.is_available() else "cpu"
    try:
        tokenizer = KronosTokenizer.from_pretrained(TOKENIZER_ID, revision=TOKENIZER_REVISION)
        model = Kronos.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
        predictor = KronosPredictor(model, tokenizer, device=device_name, max_context=MAX_CONTEXT)
        predictor.model.eval()
    except Exception as error:
        predictor = None
        logging.exception("Kronos weights could not be loaded: %s", error)


@app.get("/health")
def health() -> dict:
    return {
        "status": "online" if predictor is not None else "offline",
        "model_loaded": predictor is not None,
        "model_name": MODEL_ID,
        "tokenizer_name": TOKENIZER_ID,
        "device": device_name,
    }


@app.post("/forecast")
def forecast(body: ForecastRequest, x_service_token: str | None = Header(default=None)) -> dict:
    if not SERVICE_TOKEN:
        raise HTTPException(status_code=503, detail="KRONOS_SERVICE_TOKEN is not configured")
    if not hmac.compare_digest(x_service_token or "", SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid service token")
    if predictor is None:
        raise HTTPException(status_code=503, detail="Kronos model is unavailable")

    frame = pd.DataFrame([candle.model_dump() for candle in body.candles])
    frame["time"] = pd.to_datetime(frame["time"], utc=True, errors="coerce")
    frame = frame.dropna(subset=["time"]).sort_values("time").drop_duplicates("time")
    if len(frame) < 20:
        raise HTTPException(status_code=422, detail="At least 20 unique, timestamped candles are required")

    x_timestamps = frame["time"].reset_index(drop=True)
    last_time = x_timestamps.iloc[-1]
    interval = timedelta(seconds=body.interval_seconds)
    if body.future_times is not None:
        future_times = [pd.Timestamp(value).tz_convert("UTC") for value in body.future_times]
        if future_times[0] <= last_time:
            raise HTTPException(status_code=422, detail="future_times must occur after the last candle")
    else:
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
    for timestamp, row in predictions.iterrows():
        values = [float(row[column]) for column in ("open", "high", "low", "close", "volume")]
        open_price, high, low, close, volume = values
        if not all(math.isfinite(value) for value in values):
            raise HTTPException(status_code=502, detail="Kronos returned a non-finite forecast")
        high = max(high, open_price, close)
        low = min(low, open_price, close)
        path.append({
            "time": timestamp.isoformat(),
            "open": open_price,
            "high": high,
            "low": low,
            "close": close,
            "volume": max(0.0, volume),
        })

    if not path:
        raise HTTPException(status_code=502, detail="Kronos returned an empty forecast")

    current_price = float(frame.iloc[-1]["close"])
    target_price = path[-1]["close"]
    return {
        "symbol": body.symbol,
        "timeframe": body.timeframe,
        "model": MODEL_ID,
        "modelSource": "NeoQuasar Kronos (upstream PyTorch weights)",
        "currentPrice": current_price,
        "targetPrice": target_price,
        "direction": "UP" if target_price > current_price else "DOWN" if target_price < current_price else "FLAT",
        "forecast": path,
        "historyBars": len(frame),
        "inferenceMs": elapsed_ms,
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "method": "Kronos OHLCV forecast averaged from 5 sampled paths by upstream predictor",
    }
