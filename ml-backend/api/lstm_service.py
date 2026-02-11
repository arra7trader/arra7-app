
import numpy as np
import pandas as pd
import joblib
import logging
from typing import Dict, Optional, Union, List
from tensorflow.keras.models import load_model
from config import settings

logger = logging.getLogger(__name__)

class LSTMService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_path = f"{settings.model_path}/custom_lstm.keras"
        self.scaler_path = f"{settings.model_path}/custom_scaler.pkl"
        self.is_ready = False
        self.input_shape = (1, 60, 5) # Default input shape (batch, steps, features)

    def load_resources(self):
        """Load model and scaler from disk"""
        try:
            logger.info(f"Loading LSTM model from {self.model_path}...")
            # Compile=False is safer if custom loss/metrics were used
            self.model = load_model(self.model_path, compile=False) 
            
            logger.info(f"Loading Scaler from {self.scaler_path}...")
            self.scaler = joblib.load(self.scaler_path)
            
            # Infer input shape from model
            if self.model.input_shape:
                 # model.input_shape might be (None, TimeSteps, Features)
                self.input_shape = self.model.input_shape
                
            self.is_ready = True
            logger.info("LSTM Service successfully initialized.")
            
        except FileNotFoundError as e:
            logger.warning(f"LSTM resources not found: {e}. Place 'custom_lstm.keras' and 'custom_scaler.pkl' in models/ folder.")
            self.is_ready = False
        except Exception as e:
            logger.error(f"Error initializing LSTM Service: {e}")
            self.is_ready = False

    def preprocess(self, data: List[Dict]) -> Optional[np.ndarray]:
        """
        Preprocess raw market data into model input format.
        Expected data: List of dictionaries (OHLCV)
        """
        if not self.scaler:
            return None
            
        try:
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Ensure correct columns and order (Must match training data!)
            # Assumption: Open, High, Low, Close, Volume
            required_cols = ['open', 'high', 'low', 'close', 'volume']
            
            # Check if columns exist (case insensitive)
            df.columns = [c.lower() for c in df.columns]
            
            if not all(col in df.columns for col in required_cols):
                logger.error(f"Missing columns. Required: {required_cols}")
                return None
                
            features = df[required_cols].values
            
            # Scale data
            scaled_features = self.scaler.transform(features)
            
            # Reshape for LSTM (1, TimeSteps, Features)
            # We assume the input data length matches the model's required timestep
            time_steps = self.input_shape[1] if self.input_shape[1] else 60
            
            if len(scaled_features) < time_steps:
                logger.warning(f"Not enough data points. Need {time_steps}, got {len(scaled_features)}")
                # Padding or returning None? For now, let's return None to be safe.
                return None
            
            # Take the last 'time_steps'
            input_seq = scaled_features[-time_steps:]
            input_seq = np.expand_dims(input_seq, axis=0) # Add batch dimension
            
            return input_seq
            
        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            return None

    def predict_next(self, market_data: List[Dict]) -> Dict:
        """
        Predict the next value/direction based on market data
        """
        if not self.is_ready:
            return {"error": "Service not ready (Model/Scaler missing)"}
            
        input_seq = self.preprocess(market_data)
        
        if input_seq is None:
            return {"error": "Preprocessing failed"}
            
        try:
            pred = self.model.predict(input_seq, verbose=0)
            
            # Handle Regression (Shape: [1, 1] or [1])
            if pred.shape[-1] == 1:
                val = float(pred[0][0]) if pred.ndim > 1 else float(pred[0])
                return {
                    "type": "regression",
                    "value": val,
                    "timestamp": pd.Timestamp.now().isoformat()
                }
            
            # Handle Classification
            else:
                 probs = pred[0].tolist()
                 return {
                     "type": "classification",
                     "probabilities": probs,
                     "class_index": int(np.argmax(probs)),
                     "timestamp": pd.Timestamp.now().isoformat()
                 }
                 
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {"error": str(e)}

# Singleton instance
lstm_service = LSTMService()
