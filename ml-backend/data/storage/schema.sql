-- TimescaleDB Schema for Order Book Data
-- Run this after enabling TimescaleDB extension

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Order Book Snapshots (100ms intervals)
CREATE TABLE IF NOT EXISTS order_book_snapshots (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    
    -- Best Bid/Ask
    best_bid_price DOUBLE PRECISION,
    best_ask_price DOUBLE PRECISION,
    spread DOUBLE PRECISION,
    spread_bps DOUBLE PRECISION,
    mid_price DOUBLE PRECISION,
    
    -- Volume aggregates
    total_bid_volume DOUBLE PRECISION,
    total_ask_volume DOUBLE PRECISION,
    bid_ask_imbalance DOUBLE PRECISION,
    
    -- Top 5 levels (bid)
    bid_price_l1 DOUBLE PRECISION,
    bid_volume_l1 DOUBLE PRECISION,
    bid_price_l2 DOUBLE PRECISION,
    bid_volume_l2 DOUBLE PRECISION,
    bid_price_l3 DOUBLE PRECISION,
    bid_volume_l3 DOUBLE PRECISION,
    bid_price_l4 DOUBLE PRECISION,
    bid_volume_l4 DOUBLE PRECISION,
    bid_price_l5 DOUBLE PRECISION,
    bid_volume_l5 DOUBLE PRECISION,
    
    -- Top 5 levels (ask)
    ask_price_l1 DOUBLE PRECISION,
    ask_volume_l1 DOUBLE PRECISION,
    ask_price_l2 DOUBLE PRECISION,
    ask_volume_l2 DOUBLE PRECISION,
    ask_price_l3 DOUBLE PRECISION,
    ask_volume_l3 DOUBLE PRECISION,
    ask_price_l4 DOUBLE PRECISION,
    ask_volume_l4 DOUBLE PRECISION,
    ask_price_l5 DOUBLE PRECISION,
    ask_volume_l5 DOUBLE PRECISION,
    
    -- Metadata
    update_id BIGINT,
    data_source VARCHAR(20) DEFAULT 'binance'
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('order_book_snapshots', 'time', 
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_symbol_time 
    ON order_book_snapshots (symbol, time DESC);

-- Trade data (for order flow)
CREATE TABLE IF NOT EXISTS trades (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    trade_id BIGINT,
    price DOUBLE PRECISION,
    quantity DOUBLE PRECISION,
    is_buyer_maker BOOLEAN,  -- TRUE = sell, FALSE = buy
    
    -- Metadata
    data_source VARCHAR(20) DEFAULT 'binance'
);

SELECT create_hypertable('trades', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

CREATE INDEX IF NOT EXISTS idx_trades_symbol_time 
    ON trades (symbol, time DESC);

-- Engineered Features (pre-computed for faster training)
CREATE TABLE IF NOT EXISTS engineered_features (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    
    -- Order Book Features (12)
    bid_ask_imbalance DOUBLE PRECISION,
    spread_bps DOUBLE PRECISION,
    depth_pressure_ratio DOUBLE PRECISION,
    whale_bid_count INTEGER,
    whale_ask_count INTEGER,
    bid_volume_l1 DOUBLE PRECISION,
    bid_volume_l2 DOUBLE PRECISION,
    bid_volume_l3 DOUBLE PRECISION,
    bid_volume_l4 DOUBLE PRECISION,
    bid_volume_l5 DOUBLE PRECISION,
    ask_volume_l1 DOUBLE PRECISION,
    ask_volume_l2 DOUBLE PRECISION,
    
    -- Price Action Features (8)
    price_momentum_1s DOUBLE PRECISION,
    price_momentum_5s DOUBLE PRECISION,
    price_volatility_10s DOUBLE PRECISION,
    vwap_distance DOUBLE PRECISION,
    high_low_range DOUBLE PRECISION,
    price_acceleration DOUBLE PRECISION,
    returns_1s DOUBLE PRECISION,
    returns_5s DOUBLE PRECISION,
    
    -- Trade Flow Features (6)
    buy_sell_ratio DOUBLE PRECISION,
    large_trade_count INTEGER,
    trade_velocity DOUBLE PRECISION,
    cumulative_delta DOUBLE PRECISION,
    aggressive_buy_ratio DOUBLE PRECISION,
    aggressive_sell_ratio DOUBLE PRECISION,
    
    -- Time Features (4)
    hour_of_day INTEGER,
    day_of_week INTEGER,
    session_indicator VARCHAR(10),  -- ASIA, EUROPE, US
    seconds_since_midnight INTEGER,
    
    -- Target Variables (for supervised learning)
    price_change_5s DOUBLE PRECISION,
    price_change_10s DOUBLE PRECISION,
    price_change_30s DOUBLE PRECISION,
    direction_5s SMALLINT,  -- -1, 0, 1
    direction_10s SMALLINT,
    direction_30s SMALLINT
);

SELECT create_hypertable('engineered_features', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

CREATE INDEX IF NOT EXISTS idx_features_symbol_time 
    ON engineered_features (symbol, time DESC);

-- Model Predictions (for tracking accuracy)
CREATE TABLE IF NOT EXISTS model_predictions (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    model_name VARCHAR(50),
    horizon_seconds INTEGER,
    
    -- Predictions
    predicted_direction SMALLINT,  -- -1, 0, 1
    predicted_price_change DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    
    -- Actual (filled after horizon passed)
    actual_direction SMALLINT,
    actual_price_change DOUBLE PRECISION,
    is_correct BOOLEAN,
    
    -- Metadata
    inference_time_ms DOUBLE PRECISION,
    model_version VARCHAR(20)
);

SELECT create_hypertable('model_predictions', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

CREATE INDEX IF NOT EXISTS idx_predictions_symbol_time 
    ON model_predictions (symbol, time DESC);

-- Retention policies (keep 90 days of raw data, 1 year of features)
SELECT add_retention_policy('order_book_snapshots', INTERVAL '90 days');
SELECT add_retention_policy('trades', INTERVAL '90 days');
SELECT add_retention_policy('engineered_features', INTERVAL '365 days');
SELECT add_retention_policy('model_predictions', INTERVAL '365 days');

-- Continuous aggregates for hourly stats (performance monitoring)
CREATE MATERIALIZED VIEW IF NOT EXISTS model_accuracy_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    symbol,
    model_name,
    horizon_seconds,
    COUNT(*) as total_predictions,
    SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as accuracy,
    AVG(confidence) as avg_confidence,
    AVG(inference_time_ms) as avg_inference_ms
FROM model_predictions
WHERE actual_direction IS NOT NULL
GROUP BY hour, symbol, model_name, horizon_seconds;

-- Refresh policy (update aggregates every 15 minutes)
SELECT add_continuous_aggregate_policy('model_accuracy_hourly',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes');
