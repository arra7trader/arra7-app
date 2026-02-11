
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from .lstm_service import lstm_service

router = APIRouter()

class MarketDataPoint(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: Optional[str] = None

class LSTMRequest(BaseModel):
    symbol: str
    data: List[MarketDataPoint]

@router.on_event("startup")
async def startup_event():
    lstm_service.load_resources()

@router.post("/predict/lstm")
async def predict_lstm(request: LSTMRequest):
    if not lstm_service.is_ready:
        raise HTTPException(status_code=503, detail="LSTM Service not ready. Check model files.")
    
    # Convert Pydantic models to dicts
    data_list = [d.dict() for d in request.data]
    
    # Get last N points (service handles insufficient data check)
    result = lstm_service.predict_next(data_list)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return {
        "symbol": request.symbol,
        "prediction": result
    }
