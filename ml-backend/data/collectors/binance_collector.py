"""
Real-time Binance WebSocket data collector for order book and trades
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Callable, Optional
import websockets
from tenacity import retry, stop_after_attempt, wait_exponential

from config import SYMBOL_CONFIGS
from data.storage.timescale_db import db, OrderBookSnapshot, Trade

logger = logging.getLogger(__name__)


class BinanceCollector:
    """
    Collect real-time order book and trade data from Binance WebSocket
    """
    
    def __init__(self, symbol: str, on_data_callback: Optional[Callable] = None):
        """
        Args:
            symbol: Trading symbol (e.g., 'BTCUSD', 'XAUUSD')
            on_data_callback: Optional callback function for real-time processing
        """
        if symbol not in SYMBOL_CONFIGS:
            raise ValueError(f"Unsupported symbol: {symbol}")
        
        self.symbol = symbol
        self.config = SYMBOL_CONFIGS[symbol]
        self.binance_symbol = self.config['binance_symbol'].lower()
        self.on_data_callback = on_data_callback
        
        self.ws = None
        self.is_running = False
        self.last_update_id = 0
        
        logger.info(f"Initialized collector for {symbol} ({self.binance_symbol})")
    
    async def start(self):
        """Start collecting data"""
        self.is_running = True
        
        # Start both streams concurrently
        await asyncio.gather(
            self._collect_orderbook(),
            self._collect_trades()
        )
    
    async def stop(self):
        """Stop collecting data"""
        self.is_running = False
        if self.ws:
            await self.ws.close()
        logger.info(f"Stopped collector for {self.symbol}")
    
    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=30)
    )
    async def _collect_orderbook(self):
        """Collect order book depth snapshots @ 100ms"""
        ws_url = f"wss://stream.binance.com/ws/{self.binance_symbol}@depth20@100ms"
        
        logger.info(f"Connecting to {ws_url}")
        
        async with websockets.connect(ws_url) as websocket:
            self.ws = websocket
            logger.info(f"Connected to order book stream for {self.symbol}")
            
            while self.is_running:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)
                    
                    # Parse and save
                    await self._process_orderbook(data)
                    
                except websockets.ConnectionClosed:
                    logger.warning(f"Order book connection closed for {self.symbol}")
                    break
                except Exception as e:
                    logger.error(f"Error processing order book: {e}")
    
    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=30)
    )
    async def _collect_trades(self):
        """Collect aggregated trade stream"""
        ws_url = f"wss://stream.binance.com/ws/{self.binance_symbol}@aggTrade"
        
        logger.info(f"Connecting to {ws_url}")
        
        async with websockets.connect(ws_url) as websocket:
            logger.info(f"Connected to trade stream for {self.symbol}")
            
            while self.is_running:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)
                    
                    # Parse and save
                    await self._process_trade(data)
                    
                except websockets.ConnectionClosed:
                    logger.warning(f"Trade connection closed for {self.symbol}")
                    break
                except Exception as e:
                    logger.error(f"Error processing trade: {e}")
    
    async def _process_orderbook(self, data: Dict):
        """Process and save order book snapshot"""
        try:
            timestamp = datetime.fromtimestamp(data['E'] / 1000.0)
            
            # Parse bids and asks
            bids = [[float(p), float(v)] for p, v in data['b'][:5]]  # Top 5
            asks = [[float(p), float(v)] for p, v in data['a'][:5]]
            
            if not bids or not asks:
                return
            
            # Calculate metrics
            best_bid = bids[0][0]
            best_ask = asks[0][0]
            spread = best_ask - best_bid
            mid_price = (best_bid + best_ask) / 2
            spread_bps = (spread / mid_price) * 10000 if mid_price > 0 else 0
            
            total_bid_volume = sum(v for p, v in bids)
            total_ask_volume = sum(v for p, v in asks)
            total_volume = total_bid_volume + total_ask_volume
            bid_ask_imbalance = ((total_bid_volume - total_ask_volume) / total_volume * 100) if total_volume > 0 else 0
            
            # Create snapshot record
            snapshot = OrderBookSnapshot(
                time=timestamp,
                symbol=self.symbol,
                best_bid_price=best_bid,
                best_ask_price=best_ask,
                spread=spread,
                spread_bps=spread_bps,
                mid_price=mid_price,
                total_bid_volume=total_bid_volume,
                total_ask_volume=total_ask_volume,
                bid_ask_imbalance=bid_ask_imbalance,
                
                # Bid levels
                bid_price_l1=bids[0][0] if len(bids) > 0 else None,
                bid_volume_l1=bids[0][1] if len(bids) > 0 else None,
                bid_price_l2=bids[1][0] if len(bids) > 1 else None,
                bid_volume_l2=bids[1][1] if len(bids) > 1 else None,
                bid_price_l3=bids[2][0] if len(bids) > 2 else None,
                bid_volume_l3=bids[2][1] if len(bids) > 2 else None,
                bid_price_l4=bids[3][0] if len(bids) > 3 else None,
                bid_volume_l4=bids[3][1] if len(bids) > 3 else None,
                bid_price_l5=bids[4][0] if len(bids) > 4 else None,
                bid_volume_l5=bids[4][1] if len(bids) > 4 else None,
                
                # Ask levels
                ask_price_l1=asks[0][0] if len(asks) > 0 else None,
                ask_volume_l1=asks[0][1] if len(asks) > 0 else None,
                ask_price_l2=asks[1][0] if len(asks) > 1 else None,
                ask_volume_l2=asks[1][1] if len(asks) > 1 else None,
                ask_price_l3=asks[2][0] if len(asks) > 2 else None,
                ask_volume_l3=asks[2][1] if len(asks) > 2 else None,
                ask_price_l4=asks[3][0] if len(asks) > 3 else None,
                ask_volume_l4=asks[3][1] if len(asks) > 3 else None,
                ask_price_l5=asks[4][0] if len(asks) > 4 else None,
                ask_volume_l5=asks[4][1] if len(asks) > 4 else None,
                
                update_id=data['u'],
                data_source='binance'
            )
            
            # Save to database
            session = db.get_session()
            try:
                session.merge(snapshot)  # Use merge to handle duplicates
                session.commit()
                
                # Optional callback for real-time processing
                if self.on_data_callback:
                    await self.on_data_callback('orderbook', snapshot)
                    
            except Exception as e:
                logger.error(f"Error saving order book: {e}")
                session.rollback()
            finally:
                session.close()
                
        except Exception as e:
            logger.error(f"Error processing order book data: {e}")
    
    async def _process_trade(self, data: Dict):
        """Process and save trade data"""
        try:
            timestamp = datetime.fromtimestamp(data['T'] / 1000.0)
            
            trade = Trade(
                time=timestamp,
                symbol=self.symbol,
                trade_id=data['a'],
                price=float(data['p']),
                quantity=float(data['q']),
                is_buyer_maker=data['m'],  # True = sell trade, False = buy trade
                data_source='binance'
            )
            
            # Save to database
            session = db.get_session()
            try:
                session.merge(trade)
                session.commit()
                
                # Optional callback
                if self.on_data_callback:
                    await self.on_data_callback('trade', trade)
                    
            except Exception as e:
                logger.error(f"Error saving trade: {e}")
                session.rollback()
            finally:
                session.close()
                
        except Exception as e:
            logger.error(f"Error processing trade data: {e}")


# Collector manager for multiple symbols
class CollectorManager:
    """Manage multiple collectors"""
    
    def __init__(self):
        self.collectors: Dict[str, BinanceCollector] = {}
    
    async def add_collector(self, symbol: str, callback: Optional[Callable] = None):
        """Add a new collector"""
        if symbol in self.collectors:
            logger.warning(f"Collector for {symbol} already exists")
            return
        
        collector = BinanceCollector(symbol, callback)
        self.collectors[symbol] = collector
        
        # Start in background
        asyncio.create_task(collector.start())
        logger.info(f"Started collector for {symbol}")
    
    async def remove_collector(self, symbol: str):
        """Remove and stop a collector"""
        if symbol in self.collectors:
            await self.collectors[symbol].stop()
            del self.collectors[symbol]
            logger.info(f"Removed collector for {symbol}")
    
    async def stop_all(self):
        """Stop all collectors"""
        tasks = [collector.stop() for collector in self.collectors.values()]
        await asyncio.gather(*tasks)
        self.collectors.clear()
        logger.info("All collectors stopped")


# Main entry point for testing
async def main():
    """Test the collector"""
    logging.basicConfig(level=logging.INFO)
    
    # Connect to database
    db.connect()
    
    # Create manager
    manager = CollectorManager()
    
    # Add collectors for both symbols
    await manager.add_collector('BTCUSD')
    await manager.add_collector('XAUUSD')
    
    # Run for 60 seconds
    logger.info("Collecting data for 60 seconds...")
    await asyncio.sleep(60)
    
    # Stop all
    await manager.stop_all()
    db.close()
    
    logger.info("Collection complete!")


if __name__ == "__main__":
    asyncio.run(main())
