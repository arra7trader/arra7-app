"""
Hyperparameter Optimization Configuration
Defines search spaces for each model type
"""
from typing import Dict, Any

# Hyperparameter search spaces for each model
HYPERPARAMETER_CONFIGS: Dict[str, Dict[str, Any]] = {
    'lstm': {
        'units': [32, 64, 128, 256],
        'layers': [1, 2, 3],
        'dropout': [0.1, 0.2, 0.3, 0.4],
        'recurrent_dropout': [0.0, 0.1, 0.2],
        'learning_rate': [0.001, 0.0005, 0.0001],
        'batch_size': [32, 64, 128],
        'sequence_length': [10, 20, 30, 50]
    },
    
    'bilstm': {
        'units': [32, 64, 128],
        'layers': [1, 2],
        'dropout': [0.1, 0.2, 0.3],
        'recurrent_dropout': [0.0, 0.1],
        'merge_mode': ['concat', 'sum', 'mul', 'ave'],
        'use_attention': [True, False],
        'attention_units': [16, 32, 64],
        'learning_rate': [0.001, 0.0005, 0.0001],
        'batch_size': [32, 64, 128],
        'sequence_length': [10, 20, 30]
    },
    
    'gru': {
        'units': [32, 64, 128, 256],
        'layers': [1, 2, 3],
        'dropout': [0.1, 0.2, 0.3],
        'recurrent_dropout': [0.0, 0.1],
        'reset_after': [True, False],
        'learning_rate': [0.001, 0.0005, 0.0001],
        'batch_size': [32, 64, 128, 256],
        'sequence_length': [10, 20, 30]
    },
    
    'conv1d': {
        'filters': [32, 64, 128],
        'kernel_size': [3, 5, 7],
        'conv_layers': [2, 3, 4],
        'dense_units': [64, 128, 256],
        'dropout': [0.2, 0.3, 0.4],
        'pool_size': [2, 3],
        'use_residual': [True, False],
        'learning_rate': [0.001, 0.0005],
        'batch_size': [32, 64, 128],
        'sequence_length': [20, 30, 50]
    },
    
    'ensemble': {
        'aggregation': ['weighted_avg', 'voting', 'stacking'],
        'min_confidence': [0.4, 0.5, 0.6],
        'weight_decay': [0.9, 0.95, 0.99],
        'diversity_threshold': [0.3, 0.5, 0.7],
        'performance_window': [50, 100, 200]
    }
}

# Best known configurations (baseline)
BEST_CONFIGS: Dict[str, Dict[str, Any]] = {
    'lstm': {
        'units': 128,
        'layers': 2,
        'dropout': 0.2,
        'recurrent_dropout': 0.1,
        'learning_rate': 0.0005,
        'batch_size': 64,
        'sequence_length': 20
    },
    
    'bilstm': {
        'units': 64,
        'layers': 2,
        'dropout': 0.2,
        'recurrent_dropout': 0.1,
        'merge_mode': 'concat',
        'use_attention': True,
        'attention_units': 32,
        'learning_rate': 0.0005,
        'batch_size': 64,
        'sequence_length': 20
    },
    
    'gru': {
        'units': 128,
        'layers': 2,
        'dropout': 0.2,
        'recurrent_dropout': 0.0,
        'reset_after': True,
        'learning_rate': 0.001,
        'batch_size': 128,
        'sequence_length': 20
    },
    
    'conv1d': {
        'filters': 64,
        'kernel_size': 3,
        'conv_layers': 3,
        'dense_units': 128,
        'dropout': 0.3,
        'pool_size': 2,
        'use_residual': True,
        'learning_rate': 0.001,
        'batch_size': 64,
        'sequence_length': 30
    },
    
    'ensemble': {
        'aggregation': 'weighted_avg',
        'min_confidence': 0.5,
        'weight_decay': 0.95,
        'diversity_threshold': 0.5,
        'performance_window': 100,
        'initial_weights': {
            'lstm': 0.15,
            'bilstm': 0.35,
            'gru': 0.25,
            'conv1d': 0.25
        }
    }
}

# Training configurations
TRAINING_CONFIGS = {
    'early_stopping': {
        'patience': 10,
        'min_delta': 0.001,
        'restore_best_weights': True
    },
    'reduce_lr': {
        'factor': 0.5,
        'patience': 5,
        'min_lr': 1e-6
    },
    'walk_forward': {
        'n_splits': 5,
        'train_size_ratio': 0.7,
        'gap': 10  # Gap between train and validation
    }
}

# Feature importance thresholds
FEATURE_IMPORTANCE = {
    'high': [
        'bid_ask_imbalance',
        'price_momentum_1s',
        'buy_sell_ratio',
        'spread_change',
        'volume_intensity'
    ],
    'medium': [
        'price_momentum_5s',
        'orderbook_depth_ratio',
        'volatility_1min',
        'trade_flow_imbalance',
        'vwap_deviation'
    ],
    'low': [
        'hour_of_day',
        'day_of_week',
        'is_weekend'
    ]
}


def get_hyperparams(model_name: str) -> Dict[str, Any]:
    """Get best known hyperparameters for a model"""
    return BEST_CONFIGS.get(model_name, {})


def get_search_space(model_name: str) -> Dict[str, Any]:
    """Get hyperparameter search space for a model"""
    return HYPERPARAMETER_CONFIGS.get(model_name, {})
