"""
FastAPI Server for DOM ML Predictions
Real-time inference API with WebSocket support
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import numpy as np
import asyncio
import logging
import time
from datetime import datetime

from config import settings, SYMBOL_CONFIGS
from models.lstm_model import LSTMPredictor
from models.bilstm_model import BiLSTMPredictor
from models.gru_model import GRUPredictor
from models.conv1d_model import Conv1DPredictor
from models.ensemble import EnsemblePredictor, DynamicEnsemble
from data.processors.feature_engineering import FeatureEngineer


from api.lstm_router import router as lstm_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DOM ML Prediction API",
    description="Real-time order book prediction using ensemble ML models",
    version="1.1.0"
)

# Include LSTM Router
app.include_router(lstm_router, tags=["LSTM Custom"])

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
models: Dict[str, Dict] = {}  # symbol -> model predictors
feature_engineers: Dict[str, FeatureEngineer] = {}
connected_websockets: List[WebSocket] = []


class PredictionRequest(BaseModel):
    symbol: str = "BTCUSD"
    horizon: int = 10  # seconds
    orderbook_data: Optional[Dict] = None


class PredictionResponse(BaseModel):
    symbol: str
    horizon: int
    direction: str
    direction_code: int
    confidence: float
    model_used: str
    inference_time_ms: float
    timestamp: str
    inference_time_ms: float
    timestamp: str
    probabilities: Dict[str, float]
    winrate: Optional[float] = 0.0
    individual_predictions: Optional[Dict] = None


@app.on_event("startup")
async def startup():
    """Load models on startup"""
    logger.info("Loading ML models...")
    
    for symbol in ['BTCUSD', 'XAUUSD']:
        try:
            # Initialize feature engineer
            feature_engineers[symbol] = FeatureEngineer(symbol)
            
            # Try to load saved models
            model_dir = settings.model_path
            
            predictors = {}
            
            # Load each model if exists
            try:
                predictors['lstm'] = LSTMPredictor(model_path=f"{model_dir}/lstm_{symbol}.keras")
                logger.info(f"Loaded LSTM for {symbol}")
            except Exception as e:
                logger.warning(f"Could not load LSTM for {symbol}: {e}")
            
            try:
                predictors['bi-lstm'] = BiLSTMPredictor(model_path=f"{model_dir}/bilstm_{symbol}.keras")
                logger.info(f"Loaded Bi-LSTM for {symbol}")
            except Exception as e:
                logger.warning(f"Could not load Bi-LSTM for {symbol}: {e}")
            
            try:
                predictors['gru'] = GRUPredictor(model_path=f"{model_dir}/gru_{symbol}.keras")
                logger.info(f"Loaded GRU for {symbol}")
            except Exception as e:
                logger.warning(f"Could not load GRU for {symbol}: {e}")
            
            try:
                predictors['conv1d'] = Conv1DPredictor(model_path=f"{model_dir}/conv1d_{symbol}.keras")
                logger.info(f"Loaded Conv1D for {symbol}")
            except Exception as e:
                logger.warning(f"Could not load Conv1D for {symbol}: {e}")
            
            if predictors:
                # Create ensemble
                ensemble = DynamicEnsemble(predictors)
                predictors['ensemble'] = ensemble
                models[symbol] = predictors
                logger.info(f"Models loaded for {symbol}")
            else:
                logger.warning(f"No models available for {symbol}")
                
        except Exception as e:
            logger.error(f"Error loading models for {symbol}: {e}")
    
    logger.info("Model loading complete!")


@app.get("/")
async def root():
    return {
        "service": "DOM ML Prediction API",
        "status": "running",
        "available_symbols": list(models.keys()),
        "default_model": settings.default_model
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": len(models),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Make prediction for given symbol and horizon
    """
    symbol = request.symbol.upper()
    
    if symbol not in models:
        raise HTTPException(status_code=400, detail=f"Symbol {symbol} not available")
    
    if request.horizon not in [5, 10, 30]:
        raise HTTPException(status_code=400, detail="Horizon must be 5, 10, or 30 seconds")
    
    # Get feature engineer and compute features
    fe = feature_engineers.get(symbol)
    
    if request.orderbook_data:
        # Compute features from provided orderbook data
        features = fe.compute_features(request.orderbook_data)
    else:
        # Return error if no data provided
        raise HTTPException(status_code=400, detail="orderbook_data is required")
    
    # Use ensemble by default
    predictor = models[symbol].get('ensemble') or list(models[symbol].values())[0]
    
    # Create dummy sequence (in production, this would be from real buffer)
    # For now, just use the features repeated
    sequence_length = SYMBOL_CONFIGS[symbol]['sequence_length']
    feature_values = np.array(list(features.values()))
    sequence = np.tile(feature_values, (sequence_length, 1))
    
    # Make prediction
    start_time = time.time()
    result = predictor.predict(sequence)
    inference_time = (time.time() - start_time) * 1000  # ms
    
    return PredictionResponse(
        symbol=symbol,
        horizon=request.horizon,
        direction=result['direction'],
        direction_code=result['direction_code'],
        confidence=result['confidence'],
        model_used=result.get('model', settings.default_model),
        inference_time_ms=round(inference_time, 2),
        timestamp=datetime.now().isoformat(),
        inference_time_ms=round(inference_time, 2),
        timestamp=datetime.now().isoformat(),
        probabilities=result['probabilities'],
        winrate=result.get('winrate', 0.0),
        individual_predictions=result.get('individual_predictions')
    )


@app.get("/models/{symbol}")
async def get_model_info(symbol: str):
    """Get information about loaded models for a symbol"""
    symbol = symbol.upper()
    
    if symbol not in models:
        raise HTTPException(status_code=404, detail=f"No models for {symbol}")
    
    model_info = {}
    for name, predictor in models[symbol].items():
        if hasattr(predictor, 'model'):
            model_info[name] = {
                "type": name,
                "available": True,
                "parameters": predictor.model.count_params() if hasattr(predictor.model, 'count_params') else "N/A"
            }
    
    return {
        "symbol": symbol,
        "models": model_info,
        "default": settings.default_model
    }


@app.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    """
    WebSocket endpoint for real-time predictions
    
    Client sends orderbook data, server responds with predictions
    """
    await websocket.accept()
    connected_websockets.append(websocket)
    
    symbol = symbol.upper()
    logger.info(f"WebSocket connected for {symbol}")
    
    try:
        while True:
            # Receive orderbook data from client
            data = await websocket.receive_json()
            
            if symbol not in models:
                await websocket.send_json({"error": f"Symbol {symbol} not available"})
                continue
            
            # Process and predict
            fe = feature_engineers.get(symbol)
            features = fe.compute_features(data.get('orderbook', {}))
            
            predictor = models[symbol].get('ensemble')
            if not predictor:
                await websocket.send_json({"error": "No model available"})
                continue
            
            # Create sequence from buffer (simplified)
            sequence_length = SYMBOL_CONFIGS[symbol]['sequence_length']
            feature_values = np.array(list(features.values()))
            sequence = np.tile(feature_values, (sequence_length, 1))
            
            # Predict
            start = time.time()
            result = predictor.predict(sequence)
            inference_ms = (time.time() - start) * 1000
            
            # Send prediction
            await websocket.send_json({
                "symbol": symbol,
                "direction": result['direction'],
                "direction_code": result['direction_code'],
                "confidence": result['confidence'],
                "model": result.get('model', 'ensemble'),
                "inference_time_ms": round(inference_ms, 2),
                "timestamp": datetime.now().isoformat()
            })
            
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)
        logger.info(f"WebSocket disconnected for {symbol}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)


@app.get("/performance/{symbol}")
async def get_performance(symbol: str):
    """Get model performance statistics"""
    symbol = symbol.upper()
    
    if symbol not in models:
        raise HTTPException(status_code=404, detail=f"No models for {symbol}")
    
    ensemble = models[symbol].get('ensemble')
    if isinstance(ensemble, DynamicEnsemble):
        return ensemble.get_performance_stats()
    
    return {"message": "Performance tracking not available"}


# Run with: uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
