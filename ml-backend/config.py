"""
Configuration management for ML Backend
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/arra7_ml"
    timescaledb_enabled: bool = True
    
    # Binance
    binance_api_key: str = ""
    binance_api_secret: str = ""
    
    # Model
    model_path: str = "./models/saved/"
    default_model: str = "bi-lstm"
    prediction_horizon: int = 10  # seconds
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    api_workers: int = 4
    cors_origins: List[str] = [
        "http://localhost:3000",
        "https://arra7-app.vercel.app"
    ]
    
    # Monitoring
    enable_metrics: bool = True
    metrics_port: int = 9090
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# ==========================================
# PAIR DEFINITIONS (Matches Frontend market-data.ts)
# ==========================================

# 1. FOREX MAJOR
FOREX_MAJOR = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'
]

# 2. FOREX MINOR
FOREX_MINOR = [
    'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'GBPCHF',
    'GBPAUD', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'AUDCAD', 'AUDCHF',
    'AUDNZD', 'CADCHF', 'EURNZD', 'GBPCAD', 'GBPNZD', 'NZDCAD', 'NZDCHF'
]

# 3. COMMODITIES
COMMODITIES = [
    'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'XTIUSD', 'XBRUSD', 'XNGUSD', 'XCUUSD'
]

# 4. CRYPTO
CRYPTO = [
    'BTCUSD', 'ETHUSD', 'XRPUSD', 'SOLUSD', 'BNBUSD', 'ADAUSD',
    'DOGEUSD', 'DOTUSD', 'MATICUSD', 'LINKUSD', 'AVAXUSD', 'LTCUSD'
]

# 5. INDICES
INDICES = [
    'US30', 'US500', 'USTEC', 'DE40', 'UK100', 'JP225'
]

ALL_PAIRS = FOREX_MAJOR + FOREX_MINOR + COMMODITIES + CRYPTO + INDICES

# ==========================================
# DYNAMIC CONFIGURATION GENERATOR
# ==========================================
SYMBOL_CONFIGS = {}

for symbol in ALL_PAIRS:
    # Default config template
    config = {
        'binance_symbol': None,  # Will be set for Crypto
        'tick_interval': 100,
        'history_required_days': 60,
        
        # Feature Engineering (Defaults)
        'whale_threshold': 1000000,   # $1M value default
        'large_trade_size': 100000,   # $100k value default
        'volatility_window': 10,
        
        # Model Training (CUSTOM REQUEST)
        'sequence_length': 100,
        'prediction_steps': [50, 100, 300],
        'batch_size': 256,
        'epochs': 300,        # <--- CUSTOM REQUEST: 300 Epochs
        'learning_rate': 0.001,
        
        # Validation (CUSTOM REQUEST)
        'train_size': 0.8,    # <--- CUSTOM REQUEST: 80% Train Rate
        'val_size': 0.1,      # 10%
        'test_size': 0.1,     # 10%
        'walk_forward_steps': 7,
    }

    # Customization per Category
    if symbol in CRYPTO:
        config['binance_symbol'] = symbol.replace('USD', 'USDT')
        config['whale_threshold'] = 1.0 if 'BTC' in symbol else 1000 # Adjust as needed
    
    elif symbol in COMMODITIES:
        if 'XAU' in symbol:
            config['whale_threshold'] = 10.0 # Oz
            config['sequence_length'] = 150
            config['batch_size'] = 128
            config['learning_rate'] = 0.0005
    
    SYMBOL_CONFIGS[symbol] = config


# Global settings instance
settings = Settings()
