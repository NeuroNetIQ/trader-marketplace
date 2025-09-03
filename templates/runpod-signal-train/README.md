# RunPod Signal Training Template

This template provides a production-ready training environment for signal models that can be deployed to RunPod and integrated with the NeuroNetIQ ML Marketplace.

## Features

- ✅ **Dataset Download**: Automatically downloads training data from signed URLs
- ✅ **Model Training**: Configurable training pipeline with hyperparameters
- ✅ **Hugging Face Integration**: Pushes trained models to HF Hub
- ✅ **Weights & Biases**: Optional experiment tracking
- ✅ **GPU Support**: NVIDIA CUDA-enabled Docker image
- ✅ **Error Handling**: Comprehensive logging and error reporting
- ✅ **Marketplace Integration**: Outputs training results in marketplace format

## Quick Start

### 1. Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export TRAINING_SPEC='{"round_id":"2025-01-02","dataset_urls":["https://example.com/train.csv"],"task":"signal","hyperparams":{"lr":0.001,"epochs":20}}'
export HF_TOKEN="your_hf_token"

# Run training
python train.py
```

### 2. Deploy with CLI

```bash
# Start training run
mp train start --task signal --round current --hp lr=0.001 --hp epochs=20

# Monitor progress
mp train logs <run_id>
mp train status <run_id>
```

## Environment Variables

The training script reads configuration from these environment variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `TRAINING_SPEC` | JSON training specification | ✅ | See below |
| `HF_TOKEN` | Hugging Face API token | ⚠️ | `hf_...` |
| `WANDB_API_KEY` | Weights & Biases API key | ❌ | `...` |

### Training Spec Format

```json
{
  "round_id": "2025-01-02",
  "dataset_urls": [
    "https://signed-url-1.com/train.csv",
    "https://signed-url-2.com/validation.csv"
  ],
  "task": "signal",
  "hyperparams": {
    "lr": 0.001,
    "epochs": 20,
    "batch_size": 256
  },
  "hf_repo_id": "vendor/model-name",
  "wandb": {
    "enabled": true,
    "project": "signal-training"
  },
  "budget": {
    "max_hours": 2,
    "max_cost_usd": 10
  }
}
```

## Training Pipeline

### 1. Dataset Download
- Downloads datasets from signed URLs provided by the marketplace
- Supports CSV and Parquet formats
- Automatically detects train/validation/test splits

### 2. Data Preparation
- Loads data using pandas
- Validates data format and schema
- Prepares features for model training

### 3. Model Training
- Configurable hyperparameters via TRAINING_SPEC
- Progress logging with epoch-by-epoch metrics
- Optional Weights & Biases integration
- Early stopping and model checkpointing

### 4. Model Saving
- Saves model artifacts locally
- Creates model configuration and metadata
- Generates README with training details

### 5. Hugging Face Upload
- Pushes trained model to HF Hub (if HF_TOKEN provided)
- Creates model card with metrics and hyperparameters
- Returns commit SHA for version tracking

### 6. Result Output
- Writes `training_result.json` with metrics and artifacts
- Marketplace reads this file to register the model version
- Includes success status and error details

## Customization

### Replace Training Logic

The main training logic is in the `train_model()` method:

```python
def train_model(self, train_data: pd.DataFrame, val_data: Optional[pd.DataFrame] = None):
    """Train the signal model"""
    # Replace this with your actual model training
    
    # Example: scikit-learn
    from sklearn.ensemble import RandomForestClassifier
    model = RandomForestClassifier(**self.hyperparams)
    model.fit(X_train, y_train)
    
    # Example: XGBoost
    import xgboost as xgb
    model = xgb.XGBClassifier(**self.hyperparams)
    model.fit(X_train, y_train)
    
    # Example: LightGBM
    import lightgbm as lgb
    model = lgb.LGBMClassifier(**self.hyperparams)
    model.fit(X_train, y_train)
    
    return metrics
```

### Add Custom Features

```python
def engineer_features(self, df: pd.DataFrame):
    """Add custom feature engineering"""
    # Technical indicators
    df['sma_20'] = df['close'].rolling(20).mean()
    df['rsi'] = calculate_rsi(df['close'])
    df['macd'] = calculate_macd(df['close'])
    
    return df
```

### Custom Metrics

```python
def calculate_metrics(self, y_true, y_pred, returns):
    """Calculate trading-specific metrics"""
    return {
        'accuracy': accuracy_score(y_true, y_pred),
        'sharpe_ratio': calculate_sharpe_ratio(returns),
        'max_drawdown': calculate_max_drawdown(returns),
        'win_rate': calculate_win_rate(returns),
        'profit_factor': calculate_profit_factor(returns),
    }
```

## Docker Deployment

### Build Image

```bash
docker build -t my-signal-trainer .
```

### Run Locally

```bash
docker run \
  -e TRAINING_SPEC='{"round_id":"2025-01-02","dataset_urls":["..."],"task":"signal","hyperparams":{"lr":0.001}}' \
  -e HF_TOKEN="your_token" \
  -v $(pwd)/output:/app/model \
  my-signal-trainer
```

### RunPod Deployment

The marketplace CLI automatically handles RunPod deployment:

```bash
mp train start --template runpod-signal-train --task signal --round current
```

## Performance Optimization

### Memory Usage
- Stream large datasets instead of loading entirely into memory
- Use data generators for batch processing
- Clean up intermediate variables

### GPU Utilization
- Use GPU-accelerated libraries (CuDF, Rapids)
- Batch operations for parallel processing
- Monitor GPU memory usage

### Training Speed
- Use efficient data formats (Parquet vs CSV)
- Implement early stopping
- Use learning rate scheduling
- Parallel data loading

## Monitoring

### Logs
- Structured logging with timestamps
- Progress indicators for long operations
- Error details with stack traces
- Performance metrics

### Weights & Biases
- Automatic experiment tracking
- Hyperparameter logging
- Real-time metrics visualization
- Model artifact storage

### Health Checks
- Docker health checks
- Training progress validation
- Resource usage monitoring
- Error detection and reporting

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce batch size or use data streaming
2. **GPU Not Available**: Check CUDA installation and GPU allocation
3. **Dataset Download Fails**: Check URL expiration and network connectivity
4. **HF Upload Fails**: Verify token permissions and repository access

### Debug Mode

```bash
export LOG_LEVEL=DEBUG
python train.py
```

### Resource Monitoring

```bash
# Monitor GPU usage
nvidia-smi

# Monitor memory usage
htop

# Monitor disk usage
df -h
```

## License

MIT - See LICENSE file for details.
