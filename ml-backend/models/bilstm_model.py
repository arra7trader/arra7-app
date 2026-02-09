"""
Bidirectional LSTM Model Architecture for DOM Prediction
Primary candidate - expected best performance for sequential data
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from typing import Tuple, Optional
import numpy as np


def create_bilstm_model(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    lstm_units: Tuple[int, int] = (64, 32),
    dropout_rate: float = 0.3,
    learning_rate: float = 0.001,
    use_attention: bool = False
) -> Model:
    """
    Create Bidirectional LSTM model
    
    Architecture:
    - Input: (batch, sequence_length, n_features)
    - Bidirectional LSTM 1: 64 units each direction (128 total), return sequences
    - Dropout: 0.3
    - Bidirectional LSTM 2: 32 units each direction (64 total)
    - Dropout: 0.3
    - Dense: 32 -> 16 -> Output
    
    Bi-LSTM dapat melihat context dari kedua arah (past & future in sequence),
    sangat cocok untuk order book yang memiliki temporal dependencies.
    
    Args:
        sequence_length: Number of timesteps
        n_features: Number of input features
        n_classes: Output classes (3: down, neutral, up)
        lstm_units: Units for each LSTM layer
        dropout_rate: Dropout rate
        learning_rate: Learning rate
        use_attention: Whether to add attention mechanism
        
    Returns:
        Compiled Keras model
    """
    inputs = layers.Input(shape=(sequence_length, n_features), name='input')
    
    # Bidirectional LSTM Layer 1
    x = layers.Bidirectional(
        layers.LSTM(
            units=lstm_units[0],
            return_sequences=True,
            kernel_regularizer=keras.regularizers.l2(0.001),
            recurrent_regularizer=keras.regularizers.l2(0.001)
        ),
        merge_mode='concat',
        name='bilstm_1'
    )(inputs)
    x = layers.Dropout(dropout_rate, name='dropout_1')(x)
    
    # Bidirectional LSTM Layer 2
    if use_attention:
        # Return sequences for attention
        x = layers.Bidirectional(
            layers.LSTM(
                units=lstm_units[1],
                return_sequences=True,
                kernel_regularizer=keras.regularizers.l2(0.001)
            ),
            merge_mode='concat',
            name='bilstm_2'
        )(x)
        
        # Simple attention mechanism
        attention_weights = layers.Dense(1, activation='tanh', name='attention_score')(x)
        attention_weights = layers.Softmax(axis=1, name='attention_softmax')(attention_weights)
        x = layers.Multiply(name='attention_apply')([x, attention_weights])
        x = layers.Lambda(lambda t: tf.reduce_sum(t, axis=1), name='attention_sum')(x)
    else:
        x = layers.Bidirectional(
            layers.LSTM(
                units=lstm_units[1],
                return_sequences=False,
                kernel_regularizer=keras.regularizers.l2(0.001)
            ),
            merge_mode='concat',
            name='bilstm_2'
        )(x)
    
    x = layers.Dropout(dropout_rate, name='dropout_2')(x)
    
    # Dense layers
    x = layers.Dense(32, activation='relu', name='dense_1')(x)
    x = layers.Dense(16, activation='relu', name='dense_2')(x)
    
    # Output
    outputs = layers.Dense(n_classes, activation='softmax', name='output')(x)
    
    # Create model
    model = Model(inputs=inputs, outputs=outputs, name='bilstm_advanced')
    
    # Compile with custom metrics
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=[
            'accuracy',
            keras.metrics.SparseCategoricalAccuracy(name='sparse_acc')
        ]
    )
    
    return model


def create_bilstm_with_attention(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    learning_rate: float = 0.001
) -> Model:
    """Create Bi-LSTM with self-attention (more complex, potentially higher accuracy)"""
    return create_bilstm_model(
        sequence_length=sequence_length,
        n_features=n_features,
        n_classes=n_classes,
        lstm_units=(64, 32),
        dropout_rate=0.3,
        learning_rate=learning_rate,
        use_attention=True
    )


def get_bilstm_callbacks(
    model_path: str = './models/saved/bilstm_best.keras',
    patience: int = 15
) -> list:
    """Get callbacks optimized for Bi-LSTM training"""
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
            patience=7,
            min_lr=1e-7,
            verbose=1
        ),
        ModelCheckpoint(
            filepath=model_path,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]


class BiLSTMPredictor:
    """Wrapper for Bi-LSTM model inference"""
    
    def __init__(self, model: Optional[Model] = None, model_path: Optional[str] = None):
        if model is not None:
            self.model = model
        elif model_path is not None:
            self.model = keras.models.load_model(model_path)
        else:
            raise ValueError("Either model or model_path must be provided")
        
        self.classes = ['DOWN', 'NEUTRAL', 'UP']
        self.name = 'bi-lstm'
    
    def predict(self, sequence: np.ndarray) -> dict:
        """Make prediction on single sequence"""
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        probs = self.model.predict(sequence, verbose=0)[0]
        pred_class = np.argmax(probs)
        confidence = float(probs[pred_class])
        
        return {
            'model': self.name,
            'direction': self.classes[pred_class],
            'direction_code': int(pred_class - 1),
            'confidence': confidence,
            'probabilities': {
                'DOWN': float(probs[0]),
                'NEUTRAL': float(probs[1]),
                'UP': float(probs[2])
            }
        }
    
    def predict_proba(self, sequence: np.ndarray) -> np.ndarray:
        """Get raw probabilities"""
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        return self.model.predict(sequence, verbose=0)
