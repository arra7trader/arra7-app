import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

/// Represents a single order level (price point)
class DepthLevel {
  final double price;
  int bidVolume;
  int askVolume;
  
  DepthLevel(this.price, this.bidVolume, this.askVolume);
  
  int get totalVolume => bidVolume + askVolume;
}

/// Engine to generate/stream real-time order flow data
class DepthEngine extends ChangeNotifier {
  final Random _rnd = Random();
  Timer? _timer;
  
  // State
  double currentPrice = 2654.50;
  List<DepthLevel> levels = [];
  List<Offset> tradeHistory = []; // x = time (0-1), y = price
  
  bool isConnected = false;
  
  void start() {
    _initializeLevels();
    isConnected = true;
    notifyListeners(); // Notify connected
    
    // Simulate high-frequency updates (100ms)
    _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      _updateMarket();
    });
  }
  
  void stop() {
    _timer?.cancel();
    isConnected = false;
    notifyListeners();
  }
  
  void _initializeLevels() {
    levels = [];
    // Create levels around current price
    for (int i = -20; i <= 20; i++) {
      double p = currentPrice + (i * 0.1);
      levels.add(DepthLevel(
        p, 
        _rnd.nextInt(500), 
        _rnd.nextInt(500)
      ));
    }
  }
  
  void _updateMarket() {
    // 1. Random Walk Price
    if (_rnd.nextBool()) {
      double change = (_rnd.nextDouble() - 0.5) * 0.05;
      currentPrice += change;
    }
    
    // 2. Update Volumes (Liquidity pulsing)
    for (var level in levels) {
      // Decay
      if (_rnd.nextDouble() > 0.9) {
        level.bidVolume = (level.bidVolume * 0.95).toInt();
        level.askVolume = (level.askVolume * 0.95).toInt();
      }
      // New Orders
      if (_rnd.nextDouble() > 0.8) {
        if (level.price < currentPrice) {
           level.bidVolume += _rnd.nextInt(50);
        } else {
           level.askVolume += _rnd.nextInt(50);
        }
      }
    }
    
    // 3. Add Trade Dot history (simplified)
    if (_rnd.nextDouble() > 0.7) {
      // Keep only last 100 trades
      if (tradeHistory.length > 100) tradeHistory.removeAt(0);
      
      // Add new trade at current price
      // We rely on UI to map 'time' correctly, here we just store raw price
      // For simplified viz, we just notify listeners and let UI append
    }
    
    notifyListeners();
  }
  
  // Helpers for UI
  double get maxVolume {
    if (levels.isEmpty) return 100;
    return levels.map((l) => l.totalVolume).reduce(max).toDouble();
  }
}
