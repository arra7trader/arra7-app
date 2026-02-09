"""
Historical Data Loader for DOM ML
Bootstrap training data from Binance REST API
"""
import asyncio
import aiohttp
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List
import logging
import time

from config import SYMBOL_CONFIGS

logger = logging.getLogger(__name__)


class BinanceHistoricalLoader:
    """
    Fetch historical klines/trades from Binance for initial model training
    """
    
    BASE_URL = "https://api.binance.com"
    
    def __init__(self, symbol: str):
        if symbol not in SYMBOL_CONFIGS:
            raise ValueError(f"Unsupported symbol: {symbol}")
        
        self.symbol = symbol
        self.config = SYMBOL_CONFIGS[symbol]
        self.binance_symbol = self.config['binance_symbol']
    
    async def fetch_klines(
        self,
        interval: str = "1m",
        days: int = 60,
        output_path: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetch historical klines (OHLCV) data
        
        Args:
            interval: Kline interval (1m, 5m, 15m, 1h, etc)
            days: Number of days to fetch
            output_path: Optional CSV output path
            
        Returns:
            DataFrame with OHLCV data
        """
        logger.info(f"Fetching {days} days of {self.binance_symbol} {interval} klines...")
        
        end_time = int(datetime.now().timestamp() * 1000)
        start_time = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)
        
        all_klines = []
        current_start = start_time
        
        async with aiohttp.ClientSession() as session:
            while current_start < end_time:
                url = f"{self.BASE_URL}/api/v3/klines"
                params = {
                    "symbol": self.binance_symbol,
                    "interval": interval,
                    "startTime": current_start,
                    "endTime": end_time,
                    "limit": 1000
                }
                
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if not data:
                            break
                        all_klines.extend(data)
                        current_start = data[-1][0] + 1
                        logger.info(f"Fetched {len(all_klines)} klines...")
                    else:
                        error = await resp.text()
                        logger.error(f"Binance API error: {error}")
                        break
                
                # Rate limiting
                await asyncio.sleep(0.1)
        
        # Convert to DataFrame
        df = pd.DataFrame(all_klines, columns=[
            'open_time', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])
        
        # Convert types
        df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
        for col in ['open', 'high', 'low', 'close', 'volume', 'quote_volume', 
                    'taker_buy_base', 'taker_buy_quote']:
            df[col] = df[col].astype(float)
        df['trades'] = df['trades'].astype(int)
        
        # Drop unnecessary columns
        df = df.drop(columns=['open_time', 'close_time', 'ignore'])
        
        if output_path:
            df.to_csv(output_path, index=False)
            logger.info(f"Saved to {output_path}")
        
        logger.info(f"Total klines: {len(df)}")
        return df
    
    async def fetch_aggregated_trades(
        self,
        hours: int = 24,
        output_path: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetch historical aggregated trades
        
        Args:
            hours: Number of hours of trade history
            output_path: Optional CSV output path
            
        Returns:
            DataFrame with trade data
        """
        logger.info(f"Fetching {hours}h of {self.binance_symbol} trades...")
        
        end_time = int(datetime.now().timestamp() * 1000)
        start_time = int((datetime.now() - timedelta(hours=hours)).timestamp() * 1000)
        
        all_trades = []
        current_start = start_time
        
        async with aiohttp.ClientSession() as session:
            while current_start < end_time:
                url = f"{self.BASE_URL}/api/v3/aggTrades"
                params = {
                    "symbol": self.binance_symbol,
                    "startTime": current_start,
                    "endTime": min(current_start + 3600000, end_time),  # 1 hour chunks
                    "limit": 1000
                }
                
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data:
                            all_trades.extend(data)
                            current_start = data[-1]['T'] + 1
                        else:
                            current_start += 3600000
                        logger.info(f"Fetched {len(all_trades)} trades...")
                    else:
                        error = await resp.text()
                        logger.error(f"Binance API error: {error}")
                        current_start += 3600000
                
                await asyncio.sleep(0.1)
        
        # Convert to DataFrame
        df = pd.DataFrame(all_trades)
        if len(df) > 0:
            df = df.rename(columns={
                'a': 'agg_trade_id',
                'p': 'price',
                'q': 'quantity',
                'f': 'first_trade_id',
                'l': 'last_trade_id',
                'T': 'timestamp',
                'm': 'is_buyer_maker'
            })
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['price'] = df['price'].astype(float)
            df['quantity'] = df['quantity'].astype(float)
        
        if output_path:
            df.to_csv(output_path, index=False)
            logger.info(f"Saved to {output_path}")
        
        logger.info(f"Total trades: {len(df)}")
        return df
    
    async def fetch_order_book_snapshot(self) -> dict:
        """
        Fetch current order book snapshot
        
        Returns:
            Dict with bids and asks
        """
        async with aiohttp.ClientSession() as session:
            url = f"{self.BASE_URL}/api/v3/depth"
            params = {
                "symbol": self.binance_symbol,
                "limit": 100
            }
            
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    error = await resp.text()
                    raise Exception(f"Binance API error: {error}")


def engineer_training_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer features for ML training from kline data
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        DataFrame with engineered features
    """
    df = df.copy()
    
    # Price returns
    df['returns_1m'] = df['close'].pct_change() * 10000  # bps
    df['returns_5m'] = df['close'].pct_change(5) * 10000
    df['returns_15m'] = df['close'].pct_change(15) * 10000
    
    # Range features
    df['high_low_range'] = (df['high'] - df['low']) / df['close'] * 10000
    df['close_position'] = (df['close'] - df['low']) / (df['high'] - df['low'] + 1e-8)
    
    # Momentum
    df['momentum_10'] = df['close'] - df['close'].shift(10)
    df['momentum_20'] = df['close'] - df['close'].shift(20)
    
    # Volatility (rolling std of returns)
    df['volatility_10m'] = df['returns_1m'].rolling(10).std()
    df['volatility_30m'] = df['returns_1m'].rolling(30).std()
    
    # Volume features
    df['volume_ma_10'] = df['volume'].rolling(10).mean()
    df['volume_ratio'] = df['volume'] / (df['volume_ma_10'] + 1e-8)
    df['volume_change'] = df['volume'].pct_change()
    
    # Buy/sell pressure from taker data
    if 'taker_buy_base' in df.columns:
        df['buy_ratio'] = df['taker_buy_base'] / (df['volume'] + 1e-8)
        df['buy_sell_imbalance'] = (df['buy_ratio'] - 0.5) * 200
    else:
        df['buy_sell_imbalance'] = 0
    
    # Moving averages
    df['ma_10'] = df['close'].rolling(10).mean()
    df['ma_30'] = df['close'].rolling(30).mean()
    df['ma_distance'] = (df['close'] - df['ma_10']) / df['close'] * 10000
    df['ma_cross'] = (df['ma_10'] - df['ma_30']) / df['close'] * 10000
    
    # RSI
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / (loss + 1e-8)
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # Time features
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    
    # Target: Future direction (10 periods ahead = 10 minutes for 1m data)
    future_returns = df['close'].shift(-10) / df['close'] - 1
    future_returns_bps = future_returns * 10000
    
    # Classify
    threshold = 5  # 5 bps threshold
    df['target'] = 1  # Neutral
    df.loc[future_returns_bps > threshold, 'target'] = 2  # UP
    df.loc[future_returns_bps < -threshold, 'target'] = 0  # DOWN
    
    # Drop NaN
    df = df.dropna()
    
    return df


async def bootstrap_training_data(symbol: str, days: int = 60) -> pd.DataFrame:
    """
    Complete pipeline to fetch and prepare training data
    
    Args:
        symbol: Trading symbol (BTCUSD or XAUUSD)
        days: Days of historical data
        
    Returns:
        DataFrame ready for training
    """
    loader = BinanceHistoricalLoader(symbol)
    
    # Fetch klines
    df = await loader.fetch_klines(interval="1m", days=days)
    
    # Engineer features
    df_features = engineer_training_features(df)
    
    # Save
    output_path = f"./data/{symbol}_training_data.csv"
    df_features.to_csv(output_path, index=False)
    logger.info(f"Training data saved to {output_path}")
    
    return df_features


# CLI entrypoint
if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    symbol = sys.argv[1] if len(sys.argv) > 1 else "BTCUSD"
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    
    print(f"Bootstrapping {days} days of {symbol} training data...")
    df = asyncio.run(bootstrap_training_data(symbol, days))
    print(f"Done! Shape: {df.shape}")
