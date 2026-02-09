"""
Performance Monitoring for DOM ML
Tracks prediction accuracy, latency, and model health
"""
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import deque
import threading
import json

logger = logging.getLogger(__name__)


class PredictionRecord:
    """Single prediction record for tracking"""
    
    def __init__(
        self,
        prediction_id: str,
        symbol: str,
        model: str,
        direction: int,
        confidence: float,
        initial_price: float,
        timestamp: datetime = None
    ):
        self.prediction_id = prediction_id
        self.symbol = symbol
        self.model = model
        self.direction = direction
        self.confidence = confidence
        self.initial_price = initial_price
        self.timestamp = timestamp or datetime.now()
        self.actual_direction: Optional[int] = None
        self.is_correct: Optional[bool] = None
        self.verified_at: Optional[datetime] = None
        self.inference_time_ms: float = 0


class PerformanceMonitor:
    """
    Monitors ML prediction performance in real-time
    """
    
    def __init__(self, max_records: int = 10000):
        self.max_records = max_records
        self.predictions: deque = deque(maxlen=max_records)
        self.latency_records: deque = deque(maxlen=1000)
        self.error_count = 0
        self.total_predictions = 0
        self._lock = threading.Lock()
        
        # Alerts thresholds
        self.accuracy_alert_threshold = 0.5
        self.latency_alert_threshold_ms = 100
        self.error_rate_threshold = 0.1
    
    def record_prediction(self, record: PredictionRecord):
        """Record a new prediction"""
        with self._lock:
            self.predictions.append(record)
            self.total_predictions += 1
    
    def record_latency(self, model: str, latency_ms: float):
        """Record inference latency"""
        with self._lock:
            self.latency_records.append({
                'model': model,
                'latency_ms': latency_ms,
                'timestamp': datetime.now()
            })
    
    def record_error(self):
        """Record a prediction error"""
        with self._lock:
            self.error_count += 1
    
    def verify_prediction(
        self,
        prediction_id: str,
        actual_price: float
    ) -> Optional[bool]:
        """
        Verify a prediction with actual price
        
        Returns:
            True if correct, False if wrong, None if not found
        """
        with self._lock:
            for pred in self.predictions:
                if pred.prediction_id == prediction_id and pred.actual_direction is None:
                    # Calculate actual direction
                    price_change = actual_price - pred.initial_price
                    price_change_bps = (price_change / pred.initial_price) * 10000
                    
                    if price_change_bps > 1:
                        actual = 1  # UP
                    elif price_change_bps < -1:
                        actual = -1  # DOWN
                    else:
                        actual = 0  # NEUTRAL
                    
                    pred.actual_direction = actual
                    pred.is_correct = pred.direction == actual
                    pred.verified_at = datetime.now()
                    
                    return pred.is_correct
            return None
    
    def get_accuracy_stats(
        self,
        symbol: Optional[str] = None,
        model: Optional[str] = None,
        hours: int = 24
    ) -> Dict:
        """
        Get accuracy statistics
        
        Args:
            symbol: Filter by symbol
            model: Filter by model
            hours: Look-back period
            
        Returns:
            Dict with accuracy metrics
        """
        cutoff = datetime.now() - timedelta(hours=hours)
        
        with self._lock:
            filtered = [
                p for p in self.predictions
                if p.timestamp >= cutoff
                and p.is_correct is not None
                and (symbol is None or p.symbol == symbol)
                and (model is None or p.model == model)
            ]
        
        if not filtered:
            return {
                'total': 0,
                'correct': 0,
                'accuracy': 0,
                'by_direction': {},
                'by_confidence': {}
            }
        
        total = len(filtered)
        correct = sum(1 for p in filtered if p.is_correct)
        
        # By direction
        by_direction = {'UP': [0, 0], 'NEUTRAL': [0, 0], 'DOWN': [0, 0]}
        direction_map = {1: 'UP', 0: 'NEUTRAL', -1: 'DOWN'}
        
        for p in filtered:
            dir_name = direction_map.get(p.direction, 'NEUTRAL')
            by_direction[dir_name][0] += 1
            if p.is_correct:
                by_direction[dir_name][1] += 1
        
        by_direction_result = {}
        for dir_name, (tot, corr) in by_direction.items():
            by_direction_result[dir_name] = {
                'total': tot,
                'correct': corr,
                'accuracy': corr / tot if tot > 0 else 0
            }
        
        # By confidence bracket
        by_confidence = {
            'low': [0, 0],    # < 0.5
            'medium': [0, 0], # 0.5 - 0.7
            'high': [0, 0]    # > 0.7
        }
        
        for p in filtered:
            if p.confidence < 0.5:
                bracket = 'low'
            elif p.confidence < 0.7:
                bracket = 'medium'
            else:
                bracket = 'high'
            
            by_confidence[bracket][0] += 1
            if p.is_correct:
                by_confidence[bracket][1] += 1
        
        by_confidence_result = {}
        for bracket, (tot, corr) in by_confidence.items():
            by_confidence_result[bracket] = {
                'total': tot,
                'correct': corr,
                'accuracy': corr / tot if tot > 0 else 0
            }
        
        return {
            'total': total,
            'correct': correct,
            'accuracy': correct / total,
            'by_direction': by_direction_result,
            'by_confidence': by_confidence_result
        }
    
    def get_latency_stats(self, model: Optional[str] = None) -> Dict:
        """Get latency statistics"""
        with self._lock:
            records = [
                r for r in self.latency_records
                if model is None or r['model'] == model
            ]
        
        if not records:
            return {
                'count': 0,
                'avg_ms': 0,
                'p50_ms': 0,
                'p95_ms': 0,
                'p99_ms': 0,
                'max_ms': 0
            }
        
        latencies = sorted([r['latency_ms'] for r in records])
        n = len(latencies)
        
        return {
            'count': n,
            'avg_ms': sum(latencies) / n,
            'p50_ms': latencies[n // 2],
            'p95_ms': latencies[int(n * 0.95)],
            'p99_ms': latencies[int(n * 0.99)],
            'max_ms': max(latencies)
        }
    
    def get_health_status(self) -> Dict:
        """Get overall system health status"""
        accuracy_stats = self.get_accuracy_stats(hours=1)
        latency_stats = self.get_latency_stats()
        
        # Calculate error rate
        error_rate = self.error_count / max(self.total_predictions, 1)
        
        # Determine status
        issues = []
        status = 'healthy'
        
        if accuracy_stats['accuracy'] < self.accuracy_alert_threshold:
            issues.append(f"Low accuracy: {accuracy_stats['accuracy']:.2%}")
            status = 'warning'
        
        if latency_stats['p95_ms'] > self.latency_alert_threshold_ms:
            issues.append(f"High latency: {latency_stats['p95_ms']:.0f}ms p95")
            status = 'warning'
        
        if error_rate > self.error_rate_threshold:
            issues.append(f"High error rate: {error_rate:.2%}")
            status = 'critical'
        
        return {
            'status': status,
            'issues': issues,
            'metrics': {
                'accuracy_1h': accuracy_stats['accuracy'],
                'latency_p95_ms': latency_stats['p95_ms'],
                'error_rate': error_rate,
                'total_predictions': self.total_predictions
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def get_model_comparison(self, symbol: str, hours: int = 24) -> List[Dict]:
        """Compare performance across models"""
        models = set()
        with self._lock:
            for p in self.predictions:
                if p.symbol == symbol:
                    models.add(p.model)
        
        comparison = []
        for model in models:
            stats = self.get_accuracy_stats(symbol=symbol, model=model, hours=hours)
            latency = self.get_latency_stats(model=model)
            comparison.append({
                'model': model,
                'accuracy': stats['accuracy'],
                'total': stats['total'],
                'latency_avg_ms': latency['avg_ms']
            })
        
        return sorted(comparison, key=lambda x: x['accuracy'], reverse=True)


# Global instance
monitor = PerformanceMonitor()
