"""
Feature Engineering Pipeline for DOM ML Prediction
Generates 30+ features from order book and trade data
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging

from config import SYMBOL_CONFIGS

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Generate ML features from raw order book and trade data
    """
    
    def __init__(self, symbol: str):
        if symbol not in SYMBOL_CONFIGS:
            raise ValueError(f"Unsupported symbol: {symbol}")
        
        self.symbol = symbol
        self.config = SYMBOL_CONFIGS[symbol]
        self.whale_threshold = self.config['whale_threshold']
        self.volatility_window = self.config['volatility_window']
        
        # Rolling windows for calculations  
        self._price_buffer: List[float] = []
        self._time_buffer: List[datetime] = []
        self._trade_buffer: List[Dict] = []
        self._delta_buffer: List[float] = []
        
        # Max buffer size (2 minutes @ 100ms = 1200 ticks)
        self.max_buffer_size = 1200
    
    def compute_features(
        self, 
        orderbook_snapshot: Dict,
        recent_trades: Optional[List[Dict]] = None
    ) -> Dict[str, float]:
        """
        Compute all features from a single order book snapshot
        
        Args:
            orderbook_snapshot: Dict with bid/ask levels
            recent_trades: Optional list of recent trades
            
        Returns:
            Dict of feature name -> value
        """
        features = {}
        
        # 1. Order Book Features (12)
        features.update(self._compute_orderbook_features(orderbook_snapshot))
        
        # 2. Price Action Features (8)
        mid_price = orderbook_snapshot.get('mid_price', 0)
        self._update_price_buffer(mid_price, datetime.now())
        features.update(self._compute_price_features())
        
        # 3. Trade Flow Features (6)
        if recent_trades:
            self._update_trade_buffer(recent_trades)
        features.update(self._compute_trade_features())
        
        # 4. Time Features (4)
        features.update(self._compute_time_features())
        
        return features
    
    def _compute_orderbook_features(self, snapshot: Dict) -> Dict[str, float]:
        """Extract features from order book snapshot"""
        features = {}
        
        # Bid/Ask imbalance
        total_bid = snapshot.get('total_bid_volume', 0)
        total_ask = snapshot.get('total_ask_volume', 0)
        total_vol = total_bid + total_ask
        
        features['bid_ask_imbalance'] = (
            (total_bid - total_ask) / total_vol * 100 
            if total_vol > 0 else 0
        )
        
        # Spread in basis points
        mid_price = snapshot.get('mid_price', 0)
        spread = snapshot.get('spread', 0)
        features['spread_bps'] = (spread / mid_price * 10000) if mid_price > 0 else 0
        
        # Depth pressure ratio (L5 vs L1)
        bid_l1 = snapshot.get('bid_volume_l1', 0)
        bid_l5 = snapshot.get('bid_volume_l5', 0)
        ask_l1 = snapshot.get('ask_volume_l1', 0)
        ask_l5 = snapshot.get('ask_volume_l5', 0)
        
        l1_total = bid_l1 + ask_l1
        l5_total = bid_l5 + ask_l5
        features['depth_pressure_ratio'] = l5_total / l1_total if l1_total > 0 else 1
        
        # Whale detection
        whale_bid_count = 0
        whale_ask_count = 0
        
        for i in range(1, 6):
            bid_vol = snapshot.get(f'bid_volume_l{i}', 0)
            ask_vol = snapshot.get(f'ask_volume_l{i}', 0)
            
            if bid_vol > self.whale_threshold:
                whale_bid_count += 1
            if ask_vol > self.whale_threshold:
                whale_ask_count += 1
        
        features['whale_bid_count'] = whale_bid_count
        features['whale_ask_count'] = whale_ask_count
        
        # Individual level volumes (normalized)
        max_vol = max(total_bid, total_ask, 0.0001)
        for i in range(1, 6):
            features[f'bid_volume_l{i}'] = snapshot.get(f'bid_volume_l{i}', 0) / max_vol
            features[f'ask_volume_l{i}'] = snapshot.get(f'ask_volume_l{i}', 0) / max_vol
        
        return features
    
    def _compute_price_features(self) -> Dict[str, float]:
        """Compute price-based features from buffer"""
        features = {}
        
        if len(self._price_buffer) < 2:
            # Not enough data
            return {
                'price_momentum_1s': 0, 'price_momentum_5s': 0,
                'price_volatility_10s': 0, 'vwap_distance': 0,
                'high_low_range': 0, 'price_acceleration': 0,
                'returns_1s': 0, 'returns_5s': 0
            }
        
        prices = np.array(self._price_buffer)
        current_price = prices[-1]
        
        # Momentum (price change)
        # 1 second = 10 ticks @ 100ms
        if len(prices) >= 10:
            features['price_momentum_1s'] = current_price - prices[-10]
            features['returns_1s'] = (current_price / prices[-10] - 1) * 10000  # bps
        else:
            features['price_momentum_1s'] = current_price - prices[0]
            features['returns_1s'] = (current_price / prices[0] - 1) * 10000
        
        # 5 second = 50 ticks
        if len(prices) >= 50:
            features['price_momentum_5s'] = current_price - prices[-50]
            features['returns_5s'] = (current_price / prices[-50] - 1) * 10000
        else:
            features['price_momentum_5s'] = features['price_momentum_1s']
            features['returns_5s'] = features['returns_1s']
        
        # Volatility (std dev of returns)
        window = min(len(prices), self.volatility_window * 10)  # window in seconds * 10
        if window >= 2:
            returns = np.diff(prices[-window:]) / prices[-window:-1]
            features['price_volatility_10s'] = np.std(returns) * 10000  # bps
        else:
            features['price_volatility_10s'] = 0
        
        # VWAP distance (simplified - use mean as proxy)
        vwap_proxy = np.mean(prices[-100:]) if len(prices) >= 100 else np.mean(prices)
        features['vwap_distance'] = (current_price - vwap_proxy) / vwap_proxy * 10000  # bps
        
        # High-Low range
        window = min(len(prices), 100)
        features['high_low_range'] = (np.max(prices[-window:]) - np.min(prices[-window:])) / current_price * 10000
        
        # Acceleration (second derivative)
        if len(prices) >= 20:
            v1 = prices[-1] - prices[-10]
            v2 = prices[-10] - prices[-20]
            features['price_acceleration'] = v1 - v2
        else:
            features['price_acceleration'] = 0
        
        return features
    
    def _compute_trade_features(self) -> Dict[str, float]:
        """Compute trade flow features"""
        features = {}
        
        if len(self._trade_buffer) < 1:
            return {
                'buy_sell_ratio': 1.0, 'large_trade_count': 0,
                'trade_velocity': 0, 'cumulative_delta': 0,
                'aggressive_buy_ratio': 0.5, 'aggressive_sell_ratio': 0.5
            }
        
        trades = self._trade_buffer[-100:]  # Last 100 trades
        
        buy_volume = sum(t['quantity'] for t in trades if not t['is_buyer_maker'])
        sell_volume = sum(t['quantity'] for t in trades if t['is_buyer_maker'])
        total_volume = buy_volume + sell_volume
        
        # Buy/Sell ratio
        features['buy_sell_ratio'] = buy_volume / sell_volume if sell_volume > 0 else 2.0
        
        # Large trade count
        large_trade_size = self.config['large_trade_size']
        features['large_trade_count'] = sum(
            1 for t in trades if t['quantity'] > large_trade_size
        )
        
        # Trade velocity (trades per second)
        if len(trades) >= 2:
            time_diff = (trades[-1]['time'] - trades[0]['time']).total_seconds()
            features['trade_velocity'] = len(trades) / time_diff if time_diff > 0 else 0
        else:
            features['trade_velocity'] = 0
        
        # Cumulative delta
        delta = sum(self._delta_buffer[-100:]) if self._delta_buffer else 0
        features['cumulative_delta'] = delta
        
        # Aggressive ratios
        features['aggressive_buy_ratio'] = buy_volume / total_volume if total_volume > 0 else 0.5
        features['aggressive_sell_ratio'] = sell_volume / total_volume if total_volume > 0 else 0.5
        
        return features
    
    def _compute_time_features(self) -> Dict[str, float]:
        """Compute time-based features"""
        now = datetime.utcnow()
        
        features = {}
        features['hour_of_day'] = now.hour
        features['day_of_week'] = now.weekday()
        
        # Trading session
        hour = now.hour
        if 0 <= hour < 8:
            session = 'ASIA'
        elif 8 <= hour < 16:
            session = 'EUROPE'
        else:
            session = 'US'
        
        # Encode session as numeric
        session_map = {'ASIA': 0, 'EUROPE': 1, 'US': 2}
        features['session_indicator'] = session_map[session]
        features['seconds_since_midnight'] = now.hour * 3600 + now.minute * 60 + now.second
        
        return features
    
    def _update_price_buffer(self, price: float, timestamp: datetime):
        """Update rolling price buffer"""
        self._price_buffer.append(price)
        self._time_buffer.append(timestamp)
        
        # Keep buffer size limited
        if len(self._price_buffer) > self.max_buffer_size:
            self._price_buffer = self._price_buffer[-self.max_buffer_size:]
            self._time_buffer = self._time_buffer[-self.max_buffer_size:]
    
    def _update_trade_buffer(self, trades: List[Dict]):
        """Update rolling trade buffer"""
        for trade in trades:
            self._trade_buffer.append(trade)
            
            # Calculate delta (buy - sell)
            delta = trade['quantity'] if not trade['is_buyer_maker'] else -trade['quantity']
            self._delta_buffer.append(delta)
        
        # Limit buffer size
        if len(self._trade_buffer) > self.max_buffer_size:
            self._trade_buffer = self._trade_buffer[-self.max_buffer_size:]
            self._delta_buffer = self._delta_buffer[-self.max_buffer_size:]
    
    def compute_targets(
        self, 
        current_price: float, 
        future_prices: Dict[int, float]
    ) -> Dict[str, float]:
        """
        Compute target variables for supervised learning
        
        Args:
            current_price: Current mid price
            future_prices: Dict of horizon (seconds) -> future price
            
        Returns:
            Target features
        """
        targets = {}
        
        for horizon, future_price in future_prices.items():
            price_change = future_price - current_price
            price_change_pct = (price_change / current_price) * 10000  # bps
            
            # Direction: -1 (down), 0 (neutral), 1 (up)
            if price_change_pct > 1:  # More than 1 bps up
                direction = 1
            elif price_change_pct < -1:  # More than 1 bps down
                direction = -1
            else:
                direction = 0
            
            targets[f'price_change_{horizon}s'] = price_change_pct
            targets[f'direction_{horizon}s'] = direction
        
        return targets
    
    def reset_buffers(self):
        """Reset all rolling buffers"""
        self._price_buffer.clear()
        self._time_buffer.clear()
        self._trade_buffer.clear()
        self._delta_buffer.clear()


def create_feature_dataframe(features_list: List[Dict]) -> pd.DataFrame:
    """Convert list of feature dicts to DataFrame"""
    return pd.DataFrame(features_list)


def normalize_features(df: pd.DataFrame, method: str = 'zscore') -> Tuple[pd.DataFrame, Dict]:
    """
    Normalize features for model training
    
    Args:
        df: Feature DataFrame
        method: 'zscore' or 'minmax'
        
    Returns:
        Normalized DataFrame and normalization parameters
    """
    params = {}
    df_normalized = df.copy()
    
    # Exclude target columns and categorical
    exclude_cols = [c for c in df.columns if 'direction' in c or 'price_change' in c]
    exclude_cols += ['session_indicator', 'hour_of_day', 'day_of_week']
    
    feature_cols = [c for c in df.columns if c not in exclude_cols]
    
    if method == 'zscore':
        for col in feature_cols:
            mean = df[col].mean()
            std = df[col].std()
            if std > 0:
                df_normalized[col] = (df[col] - mean) / std
            else:
                df_normalized[col] = 0
            params[col] = {'mean': mean, 'std': std}
    
    elif method == 'minmax':
        for col in feature_cols:
            min_val = df[col].min()
            max_val = df[col].max()
            if max_val > min_val:
                df_normalized[col] = (df[col] - min_val) / (max_val - min_val)
            else:
                df_normalized[col] = 0
            params[col] = {'min': min_val, 'max': max_val}
    
    return df_normalized, params


def create_sequences(
    df: pd.DataFrame,
    sequence_length: int,
    target_col: str = 'direction_10s'
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create sequences for LSTM training
    
    Args:
        df: Feature DataFrame (normalized)
        sequence_length: Number of timesteps per sequence
        target_col: Target column name
        
    Returns:
        X (sequences) and y (targets)
    """
    # Separate features and target
    target = df[target_col].values
    
    # Exclude all target columns from features
    exclude = [c for c in df.columns if 'direction' in c or 'price_change' in c]
    feature_cols = [c for c in df.columns if c not in exclude]
    features = df[feature_cols].values
    
    X, y = [], []
    
    for i in range(len(features) - sequence_length):
        X.append(features[i:i + sequence_length])
        y.append(target[i + sequence_length])
    
    return np.array(X), np.array(y)
