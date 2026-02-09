"""
Model Versioning System for DOM ML
Tracks model versions, performance, and enables hot-reload
"""
import os
import json
import hashlib
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ModelVersion:
    """Represents a single model version"""
    
    def __init__(
        self,
        model_name: str,
        version: str,
        path: str,
        metrics: Dict,
        created_at: str = None,
        is_active: bool = False
    ):
        self.model_name = model_name
        self.version = version
        self.path = path
        self.metrics = metrics
        self.created_at = created_at or datetime.now().isoformat()
        self.is_active = is_active
    
    def to_dict(self) -> Dict:
        return {
            'model_name': self.model_name,
            'version': self.version,
            'path': self.path,
            'metrics': self.metrics,
            'created_at': self.created_at,
            'is_active': self.is_active
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ModelVersion':
        return cls(
            model_name=data['model_name'],
            version=data['version'],
            path=data['path'],
            metrics=data.get('metrics', {}),
            created_at=data.get('created_at'),
            is_active=data.get('is_active', False)
        )


class ModelVersionManager:
    """
    Manages model versions for all symbols and model types
    """
    
    def __init__(self, models_dir: str = './models/saved'):
        self.models_dir = Path(models_dir)
        self.registry_path = self.models_dir / 'version_registry.json'
        self.versions: Dict[str, Dict[str, List[ModelVersion]]] = {}
        self._load_registry()
    
    def _load_registry(self):
        """Load version registry from disk"""
        if self.registry_path.exists():
            with open(self.registry_path, 'r') as f:
                data = json.load(f)
                for symbol, models in data.items():
                    self.versions[symbol] = {}
                    for model_name, versions in models.items():
                        self.versions[symbol][model_name] = [
                            ModelVersion.from_dict(v) for v in versions
                        ]
        logger.info(f"Loaded model registry with {len(self.versions)} symbols")
    
    def _save_registry(self):
        """Save version registry to disk"""
        self.models_dir.mkdir(parents=True, exist_ok=True)
        data = {}
        for symbol, models in self.versions.items():
            data[symbol] = {}
            for model_name, versions in models.items():
                data[symbol][model_name] = [v.to_dict() for v in versions]
        
        with open(self.registry_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def register_model(
        self,
        symbol: str,
        model_name: str,
        model_path: str,
        metrics: Dict,
        activate: bool = True
    ) -> ModelVersion:
        """
        Register a new model version
        
        Args:
            symbol: Trading symbol (BTCUSD, XAUUSD)
            model_name: Model type (lstm, bilstm, gru, conv1d, ensemble)
            model_path: Path to the saved model
            metrics: Performance metrics dict
            activate: Whether to make this the active version
            
        Returns:
            The created ModelVersion
        """
        # Generate version hash
        version = self._generate_version(model_path)
        
        # Create version entry
        model_version = ModelVersion(
            model_name=model_name,
            version=version,
            path=model_path,
            metrics=metrics,
            is_active=activate
        )
        
        # Initialize symbol/model if needed
        if symbol not in self.versions:
            self.versions[symbol] = {}
        if model_name not in self.versions[symbol]:
            self.versions[symbol][model_name] = []
        
        # Deactivate other versions if activating this one
        if activate:
            for v in self.versions[symbol][model_name]:
                v.is_active = False
        
        # Add new version
        self.versions[symbol][model_name].append(model_version)
        
        # Save registry
        self._save_registry()
        
        logger.info(f"Registered {model_name} v{version} for {symbol}")
        return model_version
    
    def get_active_version(self, symbol: str, model_name: str) -> Optional[ModelVersion]:
        """Get the currently active version of a model"""
        if symbol not in self.versions or model_name not in self.versions[symbol]:
            return None
        
        for v in self.versions[symbol][model_name]:
            if v.is_active:
                return v
        return None
    
    def get_all_versions(self, symbol: str, model_name: str) -> List[ModelVersion]:
        """Get all versions of a model"""
        if symbol not in self.versions or model_name not in self.versions[symbol]:
            return []
        return self.versions[symbol][model_name]
    
    def activate_version(self, symbol: str, model_name: str, version: str) -> bool:
        """Activate a specific version"""
        if symbol not in self.versions or model_name not in self.versions[symbol]:
            return False
        
        found = False
        for v in self.versions[symbol][model_name]:
            if v.version == version:
                v.is_active = True
                found = True
            else:
                v.is_active = False
        
        if found:
            self._save_registry()
        return found
    
    def get_best_model(self, symbol: str) -> Optional[ModelVersion]:
        """Get the best performing model for a symbol based on accuracy"""
        if symbol not in self.versions:
            return None
        
        best_version = None
        best_accuracy = 0
        
        for model_name, versions in self.versions[symbol].items():
            for v in versions:
                accuracy = v.metrics.get('accuracy', 0)
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    best_version = v
        
        return best_version
    
    def get_model_summary(self, symbol: str) -> Dict:
        """Get a summary of all models for a symbol"""
        if symbol not in self.versions:
            return {}
        
        summary = {}
        for model_name, versions in self.versions[symbol].items():
            active = next((v for v in versions if v.is_active), None)
            summary[model_name] = {
                'total_versions': len(versions),
                'active_version': active.version if active else None,
                'active_accuracy': active.metrics.get('accuracy', 0) if active else 0,
                'latest_version': versions[-1].version if versions else None
            }
        return summary
    
    def _generate_version(self, model_path: str) -> str:
        """Generate version hash from model file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # If file exists, hash its content
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                file_hash = hashlib.md5(f.read()).hexdigest()[:8]
            return f"{timestamp}_{file_hash}"
        
        return timestamp


# Global instance
model_manager = ModelVersionManager()
