# DOM ML Prediction System

Real-time order book prediction using ensemble deep learning models for BTCUSD and XAUUSD.

## 🏗️ Project Structure

```
ml-backend/
├── config.py                 # Configuration & symbol parameters
├── requirements.txt          # Python dependencies
├── .env.example             # Environment template
│
├── data/
│   ├── collectors/
│   │   └── binance_collector.py    # Real-time WebSocket data
│   ├── processors/
│   │   └── feature_engineering.py  # 30+ ML features
│   └── storage/
│       ├── schema.sql              # TimescaleDB schema
│       └── timescale_db.py         # ORM models
│
├── models/
│   ├── lstm_model.py         # Baseline LSTM
│   ├── bilstm_model.py       # Bidirectional LSTM + attention
│   ├── gru_model.py          # Speed-optimized GRU
│   ├── conv1d_model.py       # Pattern recognition CNN
│   └── ensemble.py           # Dynamic ensemble predictor
│
├── training/
│   └── train_pipeline.py     # Training & evaluation
│
└── api/
    └── main.py               # FastAPI server
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd ml-backend
pip install -r requirements.txt
```

### 2. Setup Database (Optional - for data collection)
```bash
# Install PostgreSQL + TimescaleDB
psql -U postgres -f data/storage/schema.sql
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Start API Server
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

### 5. Collect Data (Background)
```python
from data.collectors.binance_collector import CollectorManager
import asyncio

async def main():
    manager = CollectorManager()
    await manager.add_collector('BTCUSD')
    await manager.add_collector('XAUUSD')
    # Let it run...

asyncio.run(main())
```

## 📊 Models

| Model | Architecture | Speed | Expected Accuracy |
|-------|-------------|-------|-------------------|
| LSTM | 2-layer LSTM | Medium | 60-65% |
| Bi-LSTM | Bidirectional + Attention | Slow | 70-75% |
| GRU | 2-layer GRU | Fast | 65-70% |
| Conv1D | 3-layer CNN + Global Pool | Fast | 65-72% |
| **Ensemble** | **Weighted voting** | **Medium** | **72-80%** |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server status |
| GET | `/health` | Health check |
| POST | `/predict` | Get prediction |
| GET | `/models/{symbol}` | Model info |
| WS | `/ws/{symbol}` | Real-time predictions |

### Example Request
```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSD",
    "horizon": 10,
    "orderbook_data": {
      "mid_price": 94500,
      "spread": 0.50,
      "spread_bps": 0.53,
      "total_bid_volume": 15.5,
      "total_ask_volume": 12.3,
      "bid_volume_l1": 2.5,
      "ask_volume_l1": 1.8
    }
  }'
```

### Response
```json
{
  "symbol": "BTCUSD",
  "horizon": 10,
  "direction": "BULLISH",
  "direction_code": 1,
  "confidence": 0.73,
  "model_used": "ensemble",
  "inference_time_ms": 45.2,
  "probabilities": {
    "DOWN": 0.12,
    "NEUTRAL": 0.15,
    "UP": 0.73
  }
}
```

## 🎯 Feature Engineering

30+ features extracted from order book data:

**Order Book (12)**: bid_ask_imbalance, spread_bps, depth_pressure_ratio, whale counts, level volumes

**Price Action (8)**: momentum, volatility, VWAP distance, returns, acceleration

**Trade Flow (6)**: buy_sell_ratio, large_trade_count, cumulative_delta

**Time (4)**: hour, day, session, seconds_since_midnight

## 🔧 Training

```python
from training.train_pipeline import TrainingPipeline
import pandas as pd

# Load your data
df = pd.read_csv('features.csv')

# Initialize pipeline
pipeline = TrainingPipeline('BTCUSD')

# Prepare data
X_train, y_train, X_val, y_val, X_test, y_test, norm_params = \
    pipeline.prepare_data(df, target_horizon=10)

# Train all models
pipeline.train_all_models(X_train, y_train, X_val, y_val)

# Evaluate
results = pipeline.evaluate_models(X_test, y_test)

# Get best model
best_name, best_model = pipeline.select_best_model()
print(f"Best: {best_name}")
```

## 📈 Next Steps

1. **Collect data** - Run collector for 1-2 months
2. **Train models** - Use walk-forward validation
3. **Deploy to production** - Docker + cloud
4. **Integrate frontend** - Add prediction overlay to DOM heatmap

## ⚠️ Disclaimer

This is for educational purposes only. Past performance does not guarantee future results. Trade responsibly.
