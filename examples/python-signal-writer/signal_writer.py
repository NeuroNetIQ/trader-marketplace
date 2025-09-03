#!/usr/bin/env python3
"""
Python Signal Writer Example

Demonstrates how to write trading signals to NeuroNetIQ Infrastructure
using marketplace contracts v0.16.0 with proper event_time and model_id.
"""

import os
import json
import time
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List

class MarketplaceSignalWriter:
    def __init__(self, infra_url: str, marketplace_token: str):
        self.infra_url = infra_url.rstrip('/')
        self.marketplace_token = marketplace_token
        self.vendor_id = os.getenv('VENDOR_ID', 'python_example')
        self.deployment_id = os.getenv('DEPLOYMENT_ID', 'dep_python_example')
        self.model_id = os.getenv('MODEL_ID', 'python_signal_model')
        self.model_version = os.getenv('MODEL_VERSION', '1.0.0')
        
    def create_signal(self, symbol: str, timeframe: str, decision: str, confidence: float, rationale: List[str] = None) -> Dict[str, Any]:
        """Create a signal payload conforming to contracts v0.16.0"""
        now = datetime.now(timezone.utc)
        
        signal = {
            # Required fields (v0.16.0)
            "symbol": symbol,
            "timeframe": timeframe,
            "decision": decision,  # "BUY" | "SELL" | "HOLD"
            "confidence": confidence,  # 0.0 to 1.0
            "model_version": self.model_version,
            "timestamp": now.isoformat(),
            "event_time": now.isoformat(),  # ✅ Required in v0.16.0
            "model_id": self.model_id,      # ✅ Required in v0.16.0
            
            # Marketplace attribution
            "vendor_id": self.vendor_id,
            "deployment_id": self.deployment_id,
            
            # Optional fields
            "rationale": rationale or [f"Python signal for {symbol} {timeframe}"],
        }
        
        return signal
    
    def create_idempotency_key(self, symbol: str, timeframe: str) -> str:
        """Create idempotency key for 5-second slots"""
        slot = int(time.time() // 5)
        return f"{symbol}:{timeframe}:{slot}"
    
    def write_signals(self, signals: List[Dict[str, Any]]) -> bool:
        """Write signals to Infrastructure"""
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.marketplace_token}',
            'X-Marketplace-Contracts-Version': '0.2.0',
            'X-Idempotency-Key': self.create_idempotency_key(signals[0]['symbol'], signals[0]['timeframe']),
            'User-Agent': f'python-signal-writer/1.0.0 vendor/{self.vendor_id}',
        }
        
        try:
            response = requests.post(
                f'{self.infra_url}/api/signals/store',
                headers=headers,
                json=signals,
                timeout=10
            )
            
            if response.status_code == 204:
                print(f"✅ Signals written successfully")
                return True
            elif response.status_code == 429:
                print(f"⚠️  Rate limited - backing off")
                return False
            else:
                print(f"❌ Failed to write signals: {response.status_code} {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Network error: {e}")
            return False

def main():
    """Example usage"""
    # Configuration from environment
    infra_url = os.getenv('INFRA_SIGNALS_URL', 'https://infra.neuronetiq.com')
    marketplace_token = os.getenv('MARKETPLACE_TOKEN')
    
    if not marketplace_token:
        print("❌ MARKETPLACE_TOKEN environment variable required")
        print("Get your token from: mp link-infra")
        return
    
    # Initialize writer
    writer = MarketplaceSignalWriter(infra_url, marketplace_token)
    
    # Generate example signals
    signals = [
        writer.create_signal(
            symbol="EURUSD",
            timeframe="5m", 
            decision="BUY",
            confidence=0.85,
            rationale=["RSI oversold", "EMA crossover bullish", "Volume confirmation"]
        ),
        writer.create_signal(
            symbol="GBPUSD",
            timeframe="5m",
            decision="HOLD", 
            confidence=0.60,
            rationale=["Mixed signals", "Awaiting breakout"]
        )
    ]
    
    # Write to Infrastructure
    print(f"📡 Writing {len(signals)} signals to Infrastructure...")
    success = writer.write_signals(signals)
    
    if success:
        print("🎉 Signals successfully sent to live trading system!")
        print("Check the consensus page: https://trader.neuronetiq.com/consensus")
    else:
        print("❌ Failed to send signals")

if __name__ == '__main__':
    main()
