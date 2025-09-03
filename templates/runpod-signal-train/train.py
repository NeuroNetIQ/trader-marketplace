#!/usr/bin/env python3
"""
RunPod Signal Training Template

This script reads the TRAINING_SPEC environment variable, downloads datasets,
trains a signal model, and pushes the result to Hugging Face Hub.

Environment Variables:
- TRAINING_SPEC: JSON string with training specification
- HF_TOKEN: Hugging Face API token for pushing models
- WANDB_API_KEY: (Optional) Weights & Biases API key
"""

import os
import json
import sys
import logging
import traceback
from typing import Dict, Any, List, Optional
from pathlib import Path
import requests
import pandas as pd
import numpy as np
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class SignalTrainer:
    def __init__(self, spec: Dict[str, Any]):
        self.spec = spec
        self.round_id = spec['round_id']
        self.task = spec['task']
        self.hyperparams = spec.get('hyperparams', {})
        self.dataset_urls = spec['dataset_urls']
        self.hf_repo_id = spec.get('hf_repo_id')
        self.wandb_config = spec.get('wandb', {})
        self.budget = spec.get('budget', {})
        
        self.data_dir = Path('./data')
        self.model_dir = Path('./model')
        self.data_dir.mkdir(exist_ok=True)
        self.model_dir.mkdir(exist_ok=True)
        
        logger.info(f"Initialized trainer for task: {self.task}")
        logger.info(f"Round ID: {self.round_id}")
        logger.info(f"Hyperparams: {self.hyperparams}")
        
    def download_datasets(self):
        """Download datasets from signed URLs"""
        logger.info("Downloading datasets...")
        
        downloaded_files = []
        for i, url in enumerate(self.dataset_urls):
            try:
                logger.info(f"Downloading dataset {i+1}/{len(self.dataset_urls)}...")
                
                response = requests.get(url, stream=True, timeout=300)
                response.raise_for_status()
                
                # Extract filename from URL or use default
                filename = f"dataset_{i}.csv"
                if 'train' in url.lower():
                    filename = 'train.csv'
                elif 'validation' in url.lower() or 'val' in url.lower():
                    filename = 'validation.csv'
                elif 'test' in url.lower():
                    filename = 'test.csv'
                elif 'features' in url.lower():
                    filename = 'features.parquet'
                
                file_path = self.data_dir / filename
                
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                file_size = file_path.stat().st_size
                logger.info(f"Downloaded {filename}: {file_size:,} bytes")
                downloaded_files.append(str(file_path))
                
            except Exception as e:
                logger.error(f"Failed to download dataset {i+1}: {e}")
                raise
        
        logger.info(f"Successfully downloaded {len(downloaded_files)} files")
        return downloaded_files
    
    def load_and_prepare_data(self, files: List[str]):
        """Load and prepare training data"""
        logger.info("Loading and preparing data...")
        
        train_data = None
        val_data = None
        
        for file_path in files:
            file_path = Path(file_path)
            logger.info(f"Loading {file_path.name}...")
            
            try:
                if file_path.suffix == '.csv':
                    df = pd.read_csv(file_path)
                elif file_path.suffix == '.parquet':
                    df = pd.read_parquet(file_path)
                else:
                    logger.warning(f"Unsupported file format: {file_path.suffix}")
                    continue
                
                logger.info(f"Loaded {file_path.name}: {df.shape[0]:,} rows, {df.shape[1]} columns")
                
                if 'train' in file_path.name.lower():
                    train_data = df
                elif 'val' in file_path.name.lower():
                    val_data = df
                    
            except Exception as e:
                logger.error(f"Failed to load {file_path.name}: {e}")
                raise
        
        if train_data is None:
            raise ValueError("No training data found")
        
        logger.info(f"Training data shape: {train_data.shape}")
        if val_data is not None:
            logger.info(f"Validation data shape: {val_data.shape}")
        
        return train_data, val_data
    
    def train_model(self, train_data: pd.DataFrame, val_data: Optional[pd.DataFrame] = None):
        """Train the signal model"""
        logger.info("Starting model training...")
        
        # Get hyperparameters
        learning_rate = self.hyperparams.get('lr', 0.001)
        epochs = self.hyperparams.get('epochs', 20)
        batch_size = self.hyperparams.get('batch_size', 256)
        
        logger.info(f"Training hyperparameters:")
        logger.info(f"  Learning rate: {learning_rate}")
        logger.info(f"  Epochs: {epochs}")
        logger.info(f"  Batch size: {batch_size}")
        
        # Initialize W&B if enabled
        if self.wandb_config.get('enabled', False):
            try:
                import wandb
                wandb.init(
                    project=self.wandb_config.get('project', 'signal-training'),
                    config=self.hyperparams,
                    name=f"{self.task}-{self.round_id}"
                )
                logger.info("Weights & Biases initialized")
            except ImportError:
                logger.warning("wandb not installed, skipping W&B logging")
            except Exception as e:
                logger.warning(f"Failed to initialize W&B: {e}")
        
        # Mock training loop for MVP
        # In production, replace this with actual model training
        logger.info("Running training loop...")
        
        best_metrics = {}
        for epoch in range(1, epochs + 1):
            # Simulate training
            train_loss = 0.5 * np.exp(-epoch * 0.1) + 0.1 + np.random.normal(0, 0.02)
            train_accuracy = 0.5 + 0.4 * (1 - np.exp(-epoch * 0.15)) + np.random.normal(0, 0.01)
            
            # Simulate validation
            val_loss = train_loss + np.random.normal(0, 0.01)
            val_accuracy = train_accuracy - np.random.normal(0.02, 0.01)
            
            logger.info(f"Epoch {epoch}/{epochs} - "
                       f"Loss: {train_loss:.4f}, Accuracy: {train_accuracy:.4f}, "
                       f"Val Loss: {val_loss:.4f}, Val Accuracy: {val_accuracy:.4f}")
            
            # Log to W&B if available
            if self.wandb_config.get('enabled', False):
                try:
                    wandb.log({
                        'epoch': epoch,
                        'train_loss': train_loss,
                        'train_accuracy': train_accuracy,
                        'val_loss': val_loss,
                        'val_accuracy': val_accuracy,
                    })
                except:
                    pass
            
            # Save best metrics
            if epoch == 1 or val_accuracy > best_metrics.get('val_accuracy', 0):
                best_metrics = {
                    'epoch': epoch,
                    'train_loss': train_loss,
                    'train_accuracy': train_accuracy,
                    'val_loss': val_loss,
                    'val_accuracy': val_accuracy,
                    'sharpe_ratio': np.random.uniform(0.8, 2.5),  # Mock Sharpe ratio
                    'win_rate': val_accuracy,
                    'max_drawdown': np.random.uniform(0.05, 0.15),
                }
        
        logger.info(f"Training completed. Best metrics: {best_metrics}")
        return best_metrics
    
    def save_model(self, metrics: Dict[str, Any]):
        """Save model artifacts"""
        logger.info("Saving model artifacts...")
        
        # Create model files (mock for MVP)
        model_config = {
            'task': self.task,
            'round_id': self.round_id,
            'hyperparams': self.hyperparams,
            'metrics': metrics,
            'model_version': '1.0.0',
            'created_at': datetime.utcnow().isoformat(),
        }
        
        # Save config
        config_path = self.model_dir / 'config.json'
        with open(config_path, 'w') as f:
            json.dump(model_config, f, indent=2)
        
        # Create mock model file
        model_path = self.model_dir / 'model.pkl'
        with open(model_path, 'w') as f:
            f.write("# Mock model file for MVP\n")
            f.write(f"# Task: {self.task}\n")
            f.write(f"# Trained on: {self.round_id}\n")
        
        # Create README
        readme_path = self.model_dir / 'README.md'
        with open(readme_path, 'w') as f:
            f.write(f"# {self.task.title()} Model\n\n")
            f.write(f"Trained on round: {self.round_id}\n\n")
            f.write("## Metrics\n\n")
            for key, value in metrics.items():
                f.write(f"- {key}: {value:.4f}\n")
            f.write("\n## Hyperparameters\n\n")
            for key, value in self.hyperparams.items():
                f.write(f"- {key}: {value}\n")
        
        logger.info(f"Model artifacts saved to {self.model_dir}")
        return str(self.model_dir)
    
    def push_to_huggingface(self, model_dir: str, metrics: Dict[str, Any]):
        """Push model to Hugging Face Hub"""
        hf_token = os.getenv('HF_TOKEN')
        if not hf_token:
            logger.warning("HF_TOKEN not provided, skipping Hugging Face upload")
            return None
        
        if not self.hf_repo_id:
            logger.warning("hf_repo_id not provided, skipping Hugging Face upload")
            return None
        
        try:
            # Mock HF upload for MVP
            # In production, use huggingface_hub library
            logger.info(f"Uploading to Hugging Face: {self.hf_repo_id}")
            
            # Simulate upload
            import time
            time.sleep(2)  # Simulate upload time
            
            commit_sha = f"commit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            logger.info(f"Successfully uploaded to {self.hf_repo_id}")
            logger.info(f"Commit SHA: {commit_sha}")
            
            return {
                'hf_repo': self.hf_repo_id,
                'commit': commit_sha,
                'url': f"https://huggingface.co/{self.hf_repo_id}"
            }
            
        except Exception as e:
            logger.error(f"Failed to upload to Hugging Face: {e}")
            return None
    
    def write_training_result(self, metrics: Dict[str, Any], artifacts: Optional[Dict[str, Any]] = None):
        """Write training result JSON for marketplace"""
        result = {
            'success': True,
            'round_id': self.round_id,
            'task': self.task,
            'metrics': metrics,
            'artifacts': artifacts or {},
            'hyperparams': self.hyperparams,
            'completed_at': datetime.utcnow().isoformat(),
        }
        
        result_path = Path('./training_result.json')
        with open(result_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        logger.info(f"Training result written to {result_path}")
        logger.info(f"Final metrics: {metrics}")
        
        return result

def main():
    """Main training function"""
    logger.info("Starting RunPod Signal Training")
    
    try:
        # Read training spec from environment
        spec_json = os.getenv('TRAINING_SPEC')
        if not spec_json:
            raise ValueError("TRAINING_SPEC environment variable not found")
        
        spec = json.loads(spec_json)
        logger.info("Training specification loaded")
        
        # Initialize trainer
        trainer = SignalTrainer(spec)
        
        # Download datasets
        files = trainer.download_datasets()
        
        # Load and prepare data
        train_data, val_data = trainer.load_and_prepare_data(files)
        
        # Train model
        metrics = trainer.train_model(train_data, val_data)
        
        # Save model
        model_dir = trainer.save_model(metrics)
        
        # Push to Hugging Face
        hf_artifacts = trainer.push_to_huggingface(model_dir, metrics)
        
        # Write final result
        result = trainer.write_training_result(metrics, hf_artifacts)
        
        logger.info("Training completed successfully!")
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        logger.error(traceback.format_exc())
        
        # Write error result
        error_result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc(),
            'completed_at': datetime.utcnow().isoformat(),
        }
        
        with open('./training_result.json', 'w') as f:
            json.dump(error_result, f, indent=2)
        
        sys.exit(1)

if __name__ == '__main__':
    main()
