"""
Training Pipeline for DOM ML Models
Handles data preparation, training, and evaluation
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import logging
import json
import os

from tensorflow import keras

from config import SYMBOL_CONFIGS
from data.processors.feature_engineering import (
    create_sequences, 
    normalize_features,
    create_feature_dataframe
)
from models.lstm_model import create_lstm_model, get_lstm_callbacks, LSTMPredictor
from models.bilstm_model import create_bilstm_model, get_bilstm_callbacks, BiLSTMPredictor
from models.gru_model import create_gru_model, get_gru_callbacks, GRUPredictor
from models.conv1d_model import create_conv1d_model, get_conv1d_callbacks, Conv1DPredictor

logger = logging.getLogger(__name__)


class TrainingPipeline:
    """
    End-to-end training pipeline for DOM prediction models
    """
    
    def __init__(self, symbol: str, model_save_dir: str = './models/saved/'):
        if symbol not in SYMBOL_CONFIGS:
            raise ValueError(f"Unsupported symbol: {symbol}")
        
        self.symbol = symbol
        self.config = SYMBOL_CONFIGS[symbol]
        self.model_save_dir = model_save_dir
        os.makedirs(model_save_dir, exist_ok=True)
        
        self.models = {}
        self.training_history = {}
        self.evaluation_results = {}
    
    def prepare_data(
        self,
        df: pd.DataFrame,
        target_horizon: int = 10,
        validation_split: Optional[float] = None,
        test_split: Optional[float] = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, Dict]:
        """
        Prepare data for training
        
        Args:
            df: Feature DataFrame with all columns
            target_horizon: Prediction horizon in seconds (5, 10, or 30)
            validation_split: Fraction for validation (default: from config)
            test_split: Fraction for testing (default: from config)
            
        Returns:
            X_train, y_train, X_val, y_val, X_test, y_test, norm_params
        """
        # Use config defaults if not provided
        validation_split = validation_split if validation_split is not None else self.config.get('val_size', 0.15)
        test_split = test_split if test_split is not None else self.config.get('test_size', 0.15)
        
        target_col = f'direction_{target_horizon}s'
        
        if target_col not in df.columns:
            raise ValueError(f"Target column {target_col} not found")
        
        # Normalize features
        df_normalized, norm_params = normalize_features(df, method='zscore')
        
        # Create sequences
        sequence_length = self.config['sequence_length']
        X, y = create_sequences(df_normalized, sequence_length, target_col)
        
        # Convert direction to class (0, 1, 2)
        # Original: -1, 0, 1 -> New: 0, 1, 2
        y = y + 1
        
        # Time-series split (not random!)
        n_samples = len(X)
        train_end = int(n_samples * (1 - validation_split - test_split))
        val_end = int(n_samples * (1 - test_split))
        
        X_train, y_train = X[:train_end], y[:train_end]
        X_val, y_val = X[train_end:val_end], y[train_end:val_end]
        X_test, y_test = X[val_end:], y[val_end:]
        
        logger.info(f"Data split: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
        
        return X_train, y_train, X_val, y_val, X_test, y_test, norm_params
    
    def train_all_models(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        epochs: Optional[int] = None
    ) -> Dict[str, dict]:
        """
        Train all 4 model architectures
        
        Returns:
            Dict of model_name -> training history
        """
        epochs = epochs or self.config['epochs']
        batch_size = self.config['batch_size']
        learning_rate = self.config['learning_rate']
        
        sequence_length = X_train.shape[1]
        n_features = X_train.shape[2]
        
        # 1. Train LSTM (Custom: 7 layers)
        logger.info("Training LSTM model (Custom 7 Layers)...")
        lstm_model = create_lstm_model(
            sequence_length=sequence_length,
            n_features=n_features,
            n_layers=7,
            lstm_units=64,
            learning_rate=learning_rate
        )
        lstm_history = lstm_model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=get_lstm_callbacks(f"{self.model_save_dir}/lstm_{self.symbol}.keras"),
            verbose=1
        )
        self.models['lstm'] = lstm_model
        self.training_history['lstm'] = lstm_history.history
        
        # 2. Train Bi-LSTM
        logger.info("Training Bi-LSTM model...")
        bilstm_model = create_bilstm_model(
            sequence_length=sequence_length,
            n_features=n_features,
            learning_rate=learning_rate
        )
        bilstm_history = bilstm_model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=get_bilstm_callbacks(f"{self.model_save_dir}/bilstm_{self.symbol}.keras"),
            verbose=1
        )
        self.models['bi-lstm'] = bilstm_model
        self.training_history['bi-lstm'] = bilstm_history.history
        
        # 3. Train GRU
        logger.info("Training GRU model...")
        gru_model = create_gru_model(
            sequence_length=sequence_length,
            n_features=n_features,
            learning_rate=learning_rate
        )
        gru_history = gru_model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=get_gru_callbacks(f"{self.model_save_dir}/gru_{self.symbol}.keras"),
            verbose=1
        )
        self.models['gru'] = gru_model
        self.training_history['gru'] = gru_history.history
        
        # 4. Train Conv1D
        logger.info("Training Conv1D model...")
        conv1d_model = create_conv1d_model(
            sequence_length=sequence_length,
            n_features=n_features,
            learning_rate=learning_rate
        )
        conv1d_history = conv1d_model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=get_conv1d_callbacks(f"{self.model_save_dir}/conv1d_{self.symbol}.keras"),
            verbose=1
        )
        self.models['conv1d'] = conv1d_model
        self.training_history['conv1d'] = conv1d_history.history
        
        logger.info("All models trained successfully!")
        return self.training_history
    
    def evaluate_models(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, Dict]:
        """
        Evaluate all trained models on test set
        
        Returns:
            Dict of model_name -> evaluation metrics
        """
        results = {}
        
        for name, model in self.models.items():
            # Evaluate
            loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
            
            # Get predictions for detailed metrics
            y_pred_probs = model.predict(X_test, verbose=0)
            y_pred = np.argmax(y_pred_probs, axis=1)
            
            # Calculate per-class metrics
            from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
            
            precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            cm = confusion_matrix(y_test, y_pred)
            
            results[name] = {
                'loss': float(loss),
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1),
                'confusion_matrix': cm.tolist()
            }
            
            logger.info(f"{name}: accuracy={accuracy:.4f}, f1={f1:.4f}")
        
        self.evaluation_results = results
        return results
    
    def select_best_model(self) -> Tuple[str, object]:
        """
        Select the best performing model
        
        Returns:
            Tuple of (model_name, model_object)
        """
        if not self.evaluation_results:
            raise RuntimeError("Run evaluate_models() first")
        
        # Rank by F1 score (better for imbalanced classes)
        best_name = max(
            self.evaluation_results.keys(),
            key=lambda k: self.evaluation_results[k]['f1_score']
        )
        
        logger.info(f"Best model: {best_name} with F1={self.evaluation_results[best_name]['f1_score']:.4f}")
        
        return best_name, self.models[best_name]
    
    def save_results(self, output_path: str = None):
        """Save training results and model comparison"""
        output_path = output_path or f"{self.model_save_dir}/training_results_{self.symbol}.json"
        
        results = {
            'symbol': self.symbol,
            'timestamp': datetime.now().isoformat(),
            'config': {
                'sequence_length': self.config['sequence_length'],
                'batch_size': self.config['batch_size'],
                'epochs': self.config['epochs']
            },
            'evaluation': self.evaluation_results,
            'best_model': self.select_best_model()[0] if self.evaluation_results else None
        }
        
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Results saved to {output_path}")


def walk_forward_validation(
    pipeline: TrainingPipeline,
    df: pd.DataFrame,
    n_splits: int = 7,
    target_horizon: int = 10
) -> Dict[str, List[float]]:
    """
    Perform walk-forward validation (time-series cross-validation)
    
    This is the proper way to validate time-series models,
    avoiding look-ahead bias.
    """
    sequence_length = pipeline.config['sequence_length']
    
    # Calculate split sizes
    total_samples = len(df) - sequence_length
    split_size = total_samples // (n_splits + 1)
    
    accuracies = {model: [] for model in ['lstm', 'bi-lstm', 'gru', 'conv1d']}
    
    for fold in range(n_splits):
        logger.info(f"Walk-forward fold {fold + 1}/{n_splits}")
        
        # Growing training set
        train_end = (fold + 2) * split_size
        test_end = (fold + 3) * split_size
        
        df_train = df.iloc[:train_end]
        df_test = df.iloc[train_end:test_end]
        
        # Prepare data
        X_train, y_train, X_val, y_val, _, _, _ = pipeline.prepare_data(
            df_train, target_horizon=target_horizon, test_split=0
        )
        X_test, y_test, _, _, _, _, _ = pipeline.prepare_data(
            df_test, target_horizon=target_horizon, validation_split=0, test_split=0
        )
        
        # Train and evaluate
        pipeline.train_all_models(X_train, y_train, X_val, y_val, epochs=30)
        results = pipeline.evaluate_models(X_test, y_test)
        
        for model_name, metrics in results.items():
            accuracies[model_name].append(metrics['accuracy'])
    
    # Calculate mean and std for each model
    summary = {}
    for model_name, accs in accuracies.items():
        summary[model_name] = {
            'mean_accuracy': np.mean(accs),
            'std_accuracy': np.std(accs),
            'folds': accs
        }
        logger.info(f"{model_name}: mean={np.mean(accs):.4f} ± {np.std(accs):.4f}")
    
    return summary
