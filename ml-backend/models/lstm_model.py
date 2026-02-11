"""
LSTM Model Architecture for DOM Prediction
Baseline model with 2 LSTM layers
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from typing import Tuple, Optional
import numpy as np


def create_lstm_model(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    lstm_units: int = 64,
    n_layers: int = 7,  # Custom request: 7 layers
    dropout_rate: float = 0.3,
    learning_rate: float = 0.001
) -> Model:
    """
    Create custom LSTM model with variable depth
    
    Architecture:
    - Input: (batch, sequence_length, n_features)
    - LSTM Layers 1 to N-1: units, return sequences=True
    - LSTM Layer N: units, return sequences=False
    - Dense: 16 units, ReLU
    - Output: 3 classes (DOWN, NEUTRAL, UP)
    """
    inputs = layers.Input(shape=(sequence_length, n_features), name='input')
    
    x = inputs
    
    # Create N-1 layers with return_sequences=True
    for i in range(n_layers - 1):
        x = layers.LSTM(
            units=lstm_units,
            return_sequences=True,
            kernel_regularizer=keras.regularizers.l2(0.001),
            name=f'lstm_{i+1}'
        )(x)
        x = layers.Dropout(dropout_rate, name=f'dropout_{i+1}')(x)
        
    # Final LSTM layer
    x = layers.LSTM(
        units=lstm_units,
        return_sequences=False,
        kernel_regularizer=keras.regularizers.l2(0.001),
        name=f'lstm_{n_layers}'
    )(x)
    x = layers.Dropout(dropout_rate, name=f'dropout_{n_layers}')(x)
    
    # Dense layers
    x = layers.Dense(16, activation='relu', name='dense_1')(x)
    
    # Output layer
    outputs = layers.Dense(n_classes, activation='softmax', name='output')(x)
    
    # Create model
    model = Model(inputs=inputs, outputs=outputs, name='lstm_baseline')
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def get_lstm_callbacks(
    model_path: str = './models/saved/lstm_best.keras',
    patience: int = 10
) -> list:
    """Get standard callbacks for LSTM training"""
    return [
        EarlyStopping(
            monitor='val_loss',
            patience=patience,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        ),
        ModelCheckpoint(
            filepath=model_path,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]


class LSTMPredictor:
    """Wrapper for LSTM model inference"""
    
    def __init__(self, model: Optional[Model] = None, model_path: Optional[str] = None):
        if model is not None:
            self.model = model
        elif model_path is not None:
            self.model = keras.models.load_model(model_path)
        else:
            raise ValueError("Either model or model_path must be provided")
        
        self.classes = ['DOWN', 'NEUTRAL', 'UP']
    
        }
    
    def predict(self, sequence: np.ndarray) -> dict:
        """
        Make prediction on a single sequence
        
        Args:
            sequence: Shape (sequence_length, n_features) or (1, sequence_length, n_features)
            
        Returns:
            Dict with prediction and confidence
        """
        # Ensure batch dimension
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        # Predict
        raw_pred = self.model.predict(sequence, verbose=0)[0]
        
        # Check if Regression (1 output) or Classification (>1 output)
        if len(raw_pred.shape) == 0 or raw_pred.shape[0] == 1:
            # Regression
            val = float(raw_pred) if len(raw_pred.shape) == 0 else float(raw_pred[0])
            return {
                'type': 'regression',
                'predicted_value': val,
                'direction': 'UP' if val > 0 else 'DOWN', # Placeholder logic, refine later
                'direction_code': 0,
                'confidence': 1.0, # Regression engines usually don't give confidence unless probabilistic
                'probabilities': {},
                'winrate': 0.0
            }

        # Classification (existing logic)
        probs = raw_pred
        
        # Get class
        pred_class = np.argmax(probs)
        confidence = float(probs[pred_class])
        
        return {
            'type': 'classification',
            'direction': self.classes[pred_class],
            'direction_code': int(pred_class - 1),  # -1, 0, 1
            'confidence': confidence,
            'probabilities': {
                'UP': float(probs[2]) if len(probs) > 2 else 0.0,
                'DOWN': float(probs[0]) if len(probs) > 0 else 0.0,
                'NEUTRAL': float(probs[1]) if len(probs) > 1 else 0.0
            },
            'winrate': round(confidence * 100, 2)
        }
    
    def predict_batch(self, sequences: np.ndarray) -> list:
        """Predict on batch of sequences"""
        probs = self.model.predict(sequences, verbose=0)
        
        results = []
        for prob in probs:
            pred_class = np.argmax(prob)
            results.append({
                'direction': self.classes[pred_class],
                'direction_code': int(pred_class - 1),
                'confidence': float(prob[pred_class])
            })
        
        return results
