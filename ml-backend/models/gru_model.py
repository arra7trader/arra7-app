"""
GRU Model Architecture for DOM Prediction
Speed-optimized variant - faster training and inference than LSTM
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from typing import Tuple, Optional
import numpy as np


def create_gru_model(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    gru_units: Tuple[int, int] = (64, 32),
    dropout_rate: float = 0.3,
    learning_rate: float = 0.001,
    use_bidirectional: bool = False
) -> Model:
    """
    Create GRU model - simpler and faster than LSTM
    
    GRU (Gated Recurrent Unit) advantages:
    - Fewer parameters than LSTM (no separate cell state)
    - ~20-30% faster training
    - Often comparable accuracy for shorter sequences
    - Better for real-time inference
    
    Architecture:
    - Input: (batch, sequence_length, n_features)
    - GRU Layer 1: 64 units, return sequences
    - Dropout: 0.3
    - GRU Layer 2: 32 units
    - Dropout: 0.3  
    - Dense: 16 -> Output
    
    Args:
        sequence_length: Number of timesteps
        n_features: Number of input features
        n_classes: Output classes
        gru_units: Units for GRU layers
        dropout_rate: Dropout rate
        learning_rate: Learning rate
        use_bidirectional: Use bidirectional GRU
        
    Returns:
        Compiled Keras model
    """
    inputs = layers.Input(shape=(sequence_length, n_features), name='input')
    
    # GRU Layer 1
    gru_1 = layers.GRU(
        units=gru_units[0],
        return_sequences=True,
        kernel_regularizer=keras.regularizers.l2(0.001),
        recurrent_dropout=0.1,  # GRU supports recurrent dropout
        name='gru_1'
    )
    
    if use_bidirectional:
        x = layers.Bidirectional(gru_1, merge_mode='concat', name='bigru_1')(inputs)
    else:
        x = gru_1(inputs)
    
    x = layers.Dropout(dropout_rate, name='dropout_1')(x)
    
    # GRU Layer 2
    gru_2 = layers.GRU(
        units=gru_units[1],
        return_sequences=False,
        kernel_regularizer=keras.regularizers.l2(0.001),
        recurrent_dropout=0.1,
        name='gru_2'
    )
    
    if use_bidirectional:
        x = layers.Bidirectional(gru_2, merge_mode='concat', name='bigru_2')(x)
    else:
        x = gru_2(x)
    
    x = layers.Dropout(dropout_rate, name='dropout_2')(x)
    
    # Dense output
    x = layers.Dense(16, activation='relu', name='dense')(x)
    outputs = layers.Dense(n_classes, activation='softmax', name='output')(x)
    
    # Create model
    model_name = 'bigru_fast' if use_bidirectional else 'gru_fast'
    model = Model(inputs=inputs, outputs=outputs, name=model_name)
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def create_stacked_gru_model(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    learning_rate: float = 0.001
) -> Model:
    """
    Create deeper stacked GRU for complex patterns
    
    3 GRU layers with residual connections
    """
    inputs = layers.Input(shape=(sequence_length, n_features), name='input')
    
    # Layer 1
    x = layers.GRU(64, return_sequences=True, name='gru_1')(inputs)
    x = layers.BatchNormalization(name='bn_1')(x)
    x = layers.Dropout(0.2, name='dropout_1')(x)
    
    # Layer 2
    x = layers.GRU(64, return_sequences=True, name='gru_2')(x)
    x = layers.BatchNormalization(name='bn_2')(x)
    x = layers.Dropout(0.2, name='dropout_2')(x)
    
    # Layer 3
    x = layers.GRU(32, return_sequences=False, name='gru_3')(x)
    x = layers.BatchNormalization(name='bn_3')(x)
    x = layers.Dropout(0.3, name='dropout_3')(x)
    
    # Dense
    x = layers.Dense(32, activation='relu', name='dense_1')(x)
    x = layers.Dense(16, activation='relu', name='dense_2')(x)
    outputs = layers.Dense(n_classes, activation='softmax', name='output')(x)
    
    model = Model(inputs=inputs, outputs=outputs, name='gru_stacked')
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def get_gru_callbacks(
    model_path: str = './models/saved/gru_best.keras',
    patience: int = 10
) -> list:
    """Get callbacks for GRU training"""
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


class GRUPredictor:
    """Wrapper for GRU model inference - optimized for speed"""
    
    def __init__(self, model: Optional[Model] = None, model_path: Optional[str] = None):
        if model is not None:
            self.model = model
        elif model_path is not None:
            self.model = keras.models.load_model(model_path)
        else:
            raise ValueError("Either model or model_path must be provided")
        
        self.classes = ['DOWN', 'NEUTRAL', 'UP']
        self.name = 'gru'
    
    def predict(self, sequence: np.ndarray) -> dict:
        """Fast prediction on single sequence"""
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        # Use predict with batch_size=1 for speed
        probs = self.model(sequence, training=False).numpy()[0]
        pred_class = np.argmax(probs)
        
        return {
            'model': self.name,
            'direction': self.classes[pred_class],
            'direction_code': int(pred_class - 1),
            'confidence': float(probs[pred_class]),
            'probabilities': {
                'DOWN': float(probs[0]),
                'NEUTRAL': float(probs[1]),
                'UP': float(probs[2])
            }
        }
    
    def predict_fast(self, sequence: np.ndarray) -> Tuple[int, float]:
        """
        Ultra-fast prediction returning only class and confidence
        For real-time inference where speed is critical
        """
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        probs = self.model(sequence, training=False).numpy()[0]
        pred_class = int(np.argmax(probs))
        
        return pred_class - 1, float(probs[pred_class])  # direction_code, confidence
