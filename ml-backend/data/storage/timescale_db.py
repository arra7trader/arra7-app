"""
TimescaleDB connection and ORM models
"""
import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, BigInteger, DateTime, SmallInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from typing import Optional
import logging

from config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# SQLAlchemy Models
class OrderBookSnapshot(Base):
    __tablename__ = 'order_book_snapshots'
    
    time = Column(DateTime, primary_key=True)
    symbol = Column(String(20), primary_key=True)
    
    # Best Bid/Ask
    best_bid_price = Column(Float)
    best_ask_price = Column(Float)
    spread = Column(Float)
    spread_bps = Column(Float)
    mid_price = Column(Float)
    
    # Volume
    total_bid_volume = Column(Float)
    total_ask_volume = Column(Float)
    bid_ask_imbalance = Column(Float)
    
    # Bid levels
    bid_price_l1 = Column(Float)
    bid_volume_l1 = Column(Float)
    bid_price_l2 = Column(Float)
    bid_volume_l2 = Column(Float)
    bid_price_l3 = Column(Float)
    bid_volume_l3 = Column(Float)
    bid_price_l4 = Column(Float)
    bid_volume_l4 = Column(Float)
    bid_price_l5 = Column(Float)
    bid_volume_l5 = Column(Float)
    
    # Ask levels
    ask_price_l1 = Column(Float)
    ask_volume_l1 = Column(Float)
    ask_price_l2 = Column(Float)
    ask_volume_l2 = Column(Float)
    ask_price_l3 = Column(Float)
    ask_volume_l3 = Column(Float)
    ask_price_l4 = Column(Float)
    ask_volume_l4 = Column(Float)
    ask_price_l5 = Column(Float)
    ask_volume_l5 = Column(Float)
    
    # Metadata
    update_id = Column(BigInteger)
    data_source = Column(String(20), default='binance')


class Trade(Base):
    __tablename__ = 'trades'
    
    time = Column(DateTime, primary_key=True)
    symbol = Column(String(20), primary_key=True)
    trade_id = Column(BigInteger, primary_key=True)
    
    price = Column(Float)
    quantity = Column(Float)
    is_buyer_maker = Column(Boolean)  # True = sell, False = buy
    
    data_source = Column(String(20), default='binance')


class EngineeredFeature(Base):
    __tablename__ = 'engineered_features'
    
    time = Column(DateTime, primary_key=True)
    symbol = Column(String(20), primary_key=True)
    
    # Order Book Features
    bid_ask_imbalance = Column(Float)
    spread_bps = Column(Float)
    depth_pressure_ratio = Column(Float)
    whale_bid_count = Column(Integer)
    whale_ask_count = Column(Integer)
    bid_volume_l1 = Column(Float)
    bid_volume_l2 = Column(Float)
    bid_volume_l3 = Column(Float)
    bid_volume_l4 = Column(Float)
    bid_volume_l5 = Column(Float)
    ask_volume_l1 = Column(Float)
    ask_volume_l2 = Column(Float)
    
    # Price Action Features
    price_momentum_1s = Column(Float)
    price_momentum_5s = Column(Float)
    price_volatility_10s = Column(Float)
    vwap_distance = Column(Float)
    high_low_range = Column(Float)
    price_acceleration = Column(Float)
    returns_1s = Column(Float)
    returns_5s = Column(Float)
    
    # Trade Flow Features
    buy_sell_ratio = Column(Float)
    large_trade_count = Column(Integer)
    trade_velocity = Column(Float)
    cumulative_delta = Column(Float)
    aggressive_buy_ratio = Column(Float)
    aggressive_sell_ratio = Column(Float)
    
    # Time Features
    hour_of_day = Column(Integer)
    day_of_week = Column(Integer)
    session_indicator = Column(String(10))
    seconds_since_midnight = Column(Integer)
    
    # Targets
    price_change_5s = Column(Float)
    price_change_10s = Column(Float)
    price_change_30s = Column(Float)
    direction_5s = Column(SmallInteger)
    direction_10s = Column(SmallInteger)
    direction_30s = Column(SmallInteger)


class ModelPrediction(Base):
    __tablename__ = 'model_predictions'
    
    time = Column(DateTime, primary_key=True)
    symbol = Column(String(20), primary_key=True)
    model_name = Column(String(50), primary_key=True)
    horizon_seconds = Column(Integer, primary_key=True)
    
    predicted_direction = Column(SmallInteger)
    predicted_price_change = Column(Float)
    confidence = Column(Float)
    
    actual_direction = Column(SmallInteger, nullable=True)
    actual_price_change = Column(Float, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    
    inference_time_ms = Column(Float)
    model_version = Column(String(20))


class DatabaseManager:
    """Database connection manager"""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or settings.database_url
        self.engine = None
        self.SessionLocal = None
    
    def connect(self):
        """Initialize database connection"""
        try:
            self.engine = create_engine(
                self.database_url,
                pool_size=20,
                max_overflow=40,
                pool_pre_ping=True,  # Test connections before using
                echo=False  # Set to True for SQL debugging
            )
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            logger.info("Database connected successfully")
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def create_tables(self):
        """Create all tables (run schema.sql instead for TimescaleDB features)"""
        Base.metadata.create_all(bind=self.engine)
        logger.info("Tables created")
    
    def get_session(self):
        """Get a new database session"""
        if self.SessionLocal is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self.SessionLocal()
    
    def close(self):
        """Close database connection"""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connection closed")


# Global database instance
db = DatabaseManager()
