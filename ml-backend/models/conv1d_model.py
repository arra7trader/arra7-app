"""
Conv1D Model Architecture for DOM Prediction
Pattern recognition specialist - good for detecting repeating order book patterns
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from typing import Tuple, Optional, List
import numpy as np


def create_conv1d_model(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    filters: Tuple[int, int, int] = (64, 128, 64),
    kernel_sizes: Tuple[int, int, int] = (3, 3, 3),
    dropout_rate: float = 0.3,
    learning_rate: float = 0.001
) -> Model:
    """
    Create 1D Convolutional Neural Network for time-series
    
    Conv1D advantages:
    - Excellent at detecting local patterns
    - Faster than RNNs (parallelizable)
    - Good for repeating microstructure patterns
    - Works well with order book "shapes"
    
    Architecture:
    - Input: (batch, sequence_length, n_features)
    - Conv1D Block 1: 64 filters, kernel=3, BatchNorm, ReLU, MaxPool
    - Conv1D Block 2: 128 filters, kernel=3, BatchNorm, ReLU, MaxPool  
    - Conv1D Block 3: 64 filters, kernel=3, BatchNorm, ReLU
    - Global Average Pooling
    - Dense: 32 -> 16 -> Output
    
    Args:
        sequence_length: Number of timesteps
        n_features: Number of input features
        n_classes: Output classes
        filters: Number of filters for each conv layer
        kernel_sizes: Kernel sizes for each layer
        dropout_rate: Dropout rate
        learning_rate: Learning rate
        
    Returns:
        Compiled Keras model
    """
    inputs = layers.Input(shape=(sequence_length, n_features), name='input')
    
    # Conv Block 1
    x = layers.Conv1D(
        filters=filters[0],
        kernel_size=kernel_sizes[0],
        padding='same',
        kernel_regularizer=keras.regularizers.l2(0.001),
        name='conv1d_1'
    )(inputs)
    x = layers.BatchNormalization(name='bn_1')(x)
    x = layers.Activation('relu', name='relu_1')(x)
    x = layers.MaxPooling1D(pool_size=2, name='maxpool_1')(x)
    x = layers.Dropout(dropout_rate, name='dropout_1')(x)
    
    # Conv Block 2
    x = layers.Conv1D(
        filters=filters[1],
        kernel_size=kernel_sizes[1],
        padding='same',
        kernel_regularizer=keras.regularizers.l2(0.001),
        name='conv1d_2'
    )(x)
    x = layers.BatchNormalization(name='bn_2')(x)
    x = layers.Activation('relu', name='relu_2')(x)
    x = layers.MaxPooling1D(pool_size=2, name='maxpool_2')(x)
    x = layers.Dropout(dropout_rate, name='dropout_2')(x)
    
    # Conv Block 3
    x = layers.Conv1D(
        filters=filters[2],
        kernel_size=kernel_sizes[2],
        padding='same',
        kernel_regularizer=keras.regularizers.l2(0.001),
        name='conv1d_3'
    )(x)
    x = layers.BatchNormalization(name='bn_3')(x)
    x = layers.Activation('relu', name='relu_3')(x)
    
    # Global pooling instead of flatten (reduces overfitting)
    x = layers.GlobalAveragePooling1D(name='global_avg_pool')(x)
    
    # Dense layers
    x = layers.Dense(32, activation='relu', name='dense_1')(x)
    x = layers.Dropout(dropout_rate, name='dropout_3')(x)
    x = layers.Dense(16, activation='relu', name='dense_2')(x)
    
    # Output
    outputs = layers.Dense(n_classes, activation='softmax', name='output')(x)
    
    # Create model
    model = Model(inputs=inputs, outputs=outputs, name='conv1d_pattern')
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def create_inception_conv1d_model(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    learning_rate: float = 0.001
) -> Model:
    """
    Create Inception-style Conv1D with multiple kernel sizes
    
    Captures patterns at different time scales simultaneously
    """
    inputs = layers.Input(shape=(sequence_length, n_features), name='input')
    
    # Multi-scale convolutions (Inception block)
    # Small kernel: short-term patterns
    conv_3 = layers.Conv1D(32, kernel_size=3, padding='same', activation='relu')(inputs)
    
    # Medium kernel: medium-term patterns
    conv_5 = layers.Conv1D(32, kernel_size=5, padding='same', activation='relu')(inputs)
    
    # Large kernel: longer-term patterns
    conv_7 = layers.Conv1D(32, kernel_size=7, padding='same', activation='relu')(inputs)
    
    # Max pooling path
    pool = layers.MaxPooling1D(pool_size=3, strides=1, padding='same')(inputs)
    pool = layers.Conv1D(32, kernel_size=1, padding='same', activation='relu')(pool)
    
    # Concatenate all paths
    x = layers.Concatenate(name='inception_concat')([conv_3, conv_5, conv_7, pool])
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    
    # Reduction conv
    x = layers.Conv1D(64, kernel_size=3, padding='same', activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(pool_size=2)(x)
    x = layers.Dropout(0.3)(x)
    
    # Second conv block
    x = layers.Conv1D(32, kernel_size=3, padding='same', activation='relu')(x)
    x = layers.BatchNormalization()(x)
    
    # Global pooling
    x = layers.GlobalAveragePooling1D()(x)
    
    # Dense
    x = layers.Dense(32, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(n_classes, activation='softmax', name='output')(x)
    
    model = Model(inputs=inputs, outputs=outputs, name='conv1d_inception')
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def create_tcn_model(
    sequence_length: int,
    n_features: int,
    n_classes: int = 3,
    learning_rate: float = 0.001
) -> Model:
    """
    Create Temporal Convolutional Network (TCN)
    
    Uses dilated causal convolutions for long-range dependencies
    while maintaining computational efficiency
    """
    inputs = layers.Input(shape=(sequence_length, n_features), name='input')
    
    # Dilated convolutions with increasing dilation rates
    x = inputs
    
    for dilation_rate in [1, 2, 4, 8]:
        # Residual connection
        residual = x
        
        # Dilated causal conv
        x = layers.Conv1D(
            64, kernel_size=3, 
            padding='causal',
            dilation_rate=dilation_rate,
            activation='relu'
        )(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.2)(x)
        
        # Match dimensions for residual
        if residual.shape[-1] != 64:
            residual = layers.Conv1D(64, kernel_size=1, padding='same')(residual)
        
        x = layers.Add()([x, residual])
        x = layers.Activation('relu')(x)
    
    # Final layers
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dense(32, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(n_classes, activation='softmax', name='output')(x)
    
    model = Model(inputs=inputs, outputs=outputs, name='tcn')
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def get_conv1d_callbacks(
    model_path: str = './models/saved/conv1d_best.keras',
    patience: int = 10
) -> list:
    """Get callbacks for Conv1D training"""
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


class Conv1DPredictor:
    """Wrapper for Conv1D model inference"""
    
    def __init__(self, model: Optional[Model] = None, model_path: Optional[str] = None):
        if model is not None:
            self.model = model
        elif model_path is not None:
            self.model = keras.models.load_model(model_path)
        else:
            raise ValueError("Either model or model_path must be provided")
        
        self.classes = ['DOWN', 'NEUTRAL', 'UP']
        self.name = 'conv1d'
    
    def predict(self, sequence: np.ndarray) -> dict:
        """Make prediction on single sequence"""
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        probs = self.model.predict(sequence, verbose=0)[0]
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
    
    def get_feature_importance(self, sequence: np.ndarray) -> np.ndarray:
        """
        Get gradient-based feature importance for interpretability
        """
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        sequence_tensor = tf.convert_to_tensor(sequence, dtype=tf.float32)
        
        with tf.GradientTape() as tape:
            tape.watch(sequence_tensor)
            predictions = self.model(sequence_tensor, training=False)
            predicted_class = tf.argmax(predictions[0])
            class_score = predictions[0, predicted_class]
        
        gradients = tape.gradient(class_score, sequence_tensor)
        
        # Average over time dimension
        feature_importance = tf.reduce_mean(tf.abs(gradients), axis=1).numpy()[0]
        
        return feature_importance
