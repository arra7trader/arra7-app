import 'dart:ui';
import '../constants/fibonacci_constants.dart';

class FibonacciLevel {
  final String label;
  final double ratio;
  final double price;
  final Color color;
  
  FibonacciLevel({
    required this.label,
    required this.ratio,
    required this.price,
    required this.color,
  });
  
  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'ratio': ratio,
      'price': price,
    };
  }
}

class FibonacciCalculation {
  final double high;
  final double low;
  final List<FibonacciLevel> levels;
  final DateTime calculatedAt;
  final String? symbol;
  
  FibonacciCalculation({
    required this.high,
    required this.low,
    required this.levels,
    required this.calculatedAt,
    this.symbol,
  });
  
  factory FibonacciCalculation.calculate({
    required double high,
    required double low,
    String? symbol,
  }) {
    final range = high - low;
    final levels = <FibonacciLevel>[];
    
    FibonacciConstants.levels.forEach((label, ratio) {
      final price = ratio <= 1.0
        ? low + (range * ratio)
        : high + (range * (ratio - 1.0));
      
      levels.add(FibonacciLevel(
        label: label,
        ratio: ratio,
        price: price,
        color: FibonacciConstants.colors[label] ?? const Color(0xFF6366F1),
      ));
    });
    
    return FibonacciCalculation(
      high: high,
      low: low,
      levels: levels,
      calculatedAt: DateTime.now(),
      symbol: symbol,
    );
  }
  
  double get range => high - low;
  
  Map<String, dynamic> toJson() {
    return {
      'high': high,
      'low': low,
      'levels': levels.map((l) => l.toJson()).toList(),
      'calculatedAt': calculatedAt.toIso8601String(),
      'symbol': symbol,
    };
  }
}
