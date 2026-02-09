"""
Ensemble Model for DOM Prediction
Combines multiple models for higher accuracy
"""
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class EnsemblePredictor:
    """
    Combine predictions from multiple models
    
    Strategies:
    1. Weighted Voting: Weight predictions by model confidence or preset weights
    2. Averaging: Simple average of probabilities
    3. Stacking: Use meta-learner to combine predictions
    """
    
    def __init__(
        self,
        models: Dict[str, object],
        weights: Optional[Dict[str, float]] = None,
        strategy: str = 'weighted_voting'
    ):
        """
        Args:
            models: Dict of model_name -> predictor object
            weights: Dict of model_name -> weight (0-1)
            strategy: 'weighted_voting', 'averaging', or 'max_confidence'
        """
        self.models = models
        self.strategy = strategy
        
        # Default weights based on expected performance
        self.weights = weights or {
            'bi-lstm': 0.40,  # Best for sequential
            'gru': 0.25,      # Fast and accurate
            'conv1d': 0.20,   # Pattern recognition
            'lstm': 0.15      # Baseline stability
        }
        
        # Normalize weights
        total = sum(self.weights.get(name, 0.1) for name in models.keys())
        self.weights = {name: self.weights.get(name, 0.1) / total for name in models.keys()}
        
        self.classes = ['DOWN', 'NEUTRAL', 'UP']
        logger.info(f"Ensemble initialized with weights: {self.weights}")
    
    def predict(self, sequence: np.ndarray) -> Dict:
        """
        Make ensemble prediction
        
        Args:
            sequence: Input sequence (sequence_length, n_features)
            
        Returns:
            Dict with prediction, confidence, and individual model results
        """
        individual_predictions = {}
        all_probs = []
        
        # Get predictions from all models
        for name, model in self.models.items():
            try:
                pred = model.predict(sequence)
                individual_predictions[name] = pred
                all_probs.append(list(pred['probabilities'].values()))
            except Exception as e:
                logger.warning(f"Model {name} failed: {e}")
        
        if not individual_predictions:
            return {
                'direction': 'NEUTRAL',
                'direction_code': 0,
                'confidence': 0.0,
                'model': 'ensemble_failed',
                'individual_predictions': {}
            }
        
        # Combine predictions based on strategy
        if self.strategy == 'weighted_voting':
            final_probs = self._weighted_voting(individual_predictions)
        elif self.strategy == 'averaging':
            final_probs = self._simple_averaging(all_probs)
        elif self.strategy == 'max_confidence':
            return self._max_confidence(individual_predictions)
        else:
            final_probs = self._weighted_voting(individual_predictions)
        
        # Get final prediction
        pred_class = np.argmax(final_probs)
        confidence = float(final_probs[pred_class])
        
        return {
            'model': 'ensemble',
            'direction': self.classes[pred_class],
            'direction_code': int(pred_class - 1),
            'confidence': confidence,
            'probabilities': {
                'DOWN': float(final_probs[0]),
                'NEUTRAL': float(final_probs[1]),
                'UP': float(final_probs[2])
            },
            'individual_predictions': individual_predictions,
            'strategy': self.strategy
        }
    
    def _weighted_voting(self, predictions: Dict) -> np.ndarray:
        """Weighted average of probabilities"""
        final_probs = np.zeros(3)
        
        for name, pred in predictions.items():
            weight = self.weights.get(name, 0.1)
            probs = np.array([
                pred['probabilities']['DOWN'],
                pred['probabilities']['NEUTRAL'],
                pred['probabilities']['UP']
            ])
            final_probs += weight * probs
        
        # Normalize
        final_probs /= final_probs.sum()
        return final_probs
    
    def _simple_averaging(self, all_probs: List[List[float]]) -> np.ndarray:
        """Simple average of all probabilities"""
        return np.mean(all_probs, axis=0)
    
    def _max_confidence(self, predictions: Dict) -> Dict:
        """Return prediction from most confident model"""
        best_model = None
        best_confidence = 0
        best_pred = None
        
        for name, pred in predictions.items():
            if pred['confidence'] > best_confidence:
                best_confidence = pred['confidence']
                best_model = name
                best_pred = pred
        
        best_pred['model'] = f'ensemble_max({best_model})'
        best_pred['individual_predictions'] = predictions
        return best_pred
    
    def update_weights(self, performance: Dict[str, float]):
        """
        Update weights based on recent model performance
        
        Args:
            performance: Dict of model_name -> accuracy (0-1)
        """
        # Scale weights by performance
        new_weights = {}
        for name in self.models.keys():
            base_weight = self.weights.get(name, 0.1)
            perf = performance.get(name, 0.5)
            # Adjust weight: if perf > 0.6, increase; if < 0.4, decrease
            adjustment = 1 + (perf - 0.5) * 2  # 0.4-1.6 multiplier
            new_weights[name] = base_weight * adjustment
        
        # Normalize
        total = sum(new_weights.values())
        self.weights = {k: v / total for k, v in new_weights.items()}
        
        logger.info(f"Updated ensemble weights: {self.weights}")


class DynamicEnsemble(EnsemblePredictor):
    """
    Dynamic ensemble that tracks performance and adapts weights
    """
    
    def __init__(self, models: Dict[str, object], tracking_window: int = 100):
        super().__init__(models, strategy='weighted_voting')
        
        self.tracking_window = tracking_window
        self.prediction_history: List[Dict] = []
        self.accuracy_tracker = {name: [] for name in models.keys()}
    
    def track_result(self, prediction: Dict, actual_direction: int):
        """
        Track prediction result for weight adjustment
        
        Args:
            prediction: Previous prediction result
            actual_direction: Actual price direction (-1, 0, 1)
        """
        actual_class = actual_direction + 1  # Convert to 0, 1, 2
        
        # Track individual model accuracy
        for name, pred in prediction.get('individual_predictions', {}).items():
            pred_class = pred['direction_code'] + 1
            is_correct = pred_class == actual_class
            
            self.accuracy_tracker[name].append(int(is_correct))
            
            # Keep only recent history
            if len(self.accuracy_tracker[name]) > self.tracking_window:
                self.accuracy_tracker[name] = self.accuracy_tracker[name][-self.tracking_window:]
        
        # Update weights every 50 predictions
        total_tracked = sum(len(v) for v in self.accuracy_tracker.values())
        if total_tracked % 50 == 0 and total_tracked > 0:
            self._auto_adjust_weights()
    
    def _auto_adjust_weights(self):
        """Automatically adjust weights based on recent performance"""
        performance = {}
        
        for name, results in self.accuracy_tracker.items():
            if results:
                performance[name] = sum(results) / len(results)
            else:
                performance[name] = 0.5
        
        self.update_weights(performance)
    
    def get_performance_stats(self) -> Dict:
        """Get current performance statistics"""
        stats = {}
        for name, results in self.accuracy_tracker.items():
            if results:
                stats[name] = {
                    'accuracy': sum(results) / len(results),
                    'samples': len(results),
                    'weight': self.weights.get(name, 0)
                }
        return stats
