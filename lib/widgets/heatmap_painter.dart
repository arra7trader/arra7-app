import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/depth_engine.dart';

class HeatmapPainter extends CustomPainter {
  final List<DepthLevel> levels;
  final double currentPrice;
  final double maxVol;

  HeatmapPainter({
    required this.levels,
    required this.currentPrice,
    required this.maxVol,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (levels.isEmpty) return;
    
    final Paint paint = Paint()..style = PaintingStyle.fill;
    
    // Config
    const double rowHeight = 20.0;
    final double centerY = size.height / 2;
    
    // Draw Background Grid
    _drawGrid(canvas, size);

    // Filter levels visible in viewport (simplified: just draw all centered)
    // Map Price to Y axis (Current Price is Center)
    
    for (var level in levels) {
      double dy = centerY + ((currentPrice - level.price) * 100); // Scale factor
      
      // Skip if out of bounds
      if (dy < -rowHeight || dy > size.height) continue;
      
      // 1. Draw Heatmap (Volume intensity)
      double totalVol = level.bidVolume + level.askVolume + 0.0;
      double intensity = (totalVol / (maxVol * 0.8)).clamp(0.0, 1.0);
      
      // Color from Blue (Low) to Red (High) - Heatmap style
      // or Dark to Bright
      Color cellColor;
      if (intensity < 0.3) {
        cellColor = Colors.blue.withOpacity(intensity * 0.5);
      } else if (intensity < 0.7) {
        cellColor = Colors.orange.withOpacity(intensity * 0.8);
      } else {
        cellColor = Colors.red.withOpacity(intensity);
      }
      
      paint.color = cellColor;
      canvas.drawRect(Rect.fromLTWH(0, dy, size.width, rowHeight), paint);
      
      // 2. Draw DOM Bars (Depth of Market) on the right side
      if (level.price > currentPrice) {
        // Asks
        paint.color = AppTheme.neonRed.withOpacity(0.3);
        double barWidth = (level.askVolume / maxVol) * (size.width * 0.3);
        canvas.drawRect(Rect.fromLTWH(size.width - barWidth, dy, barWidth, rowHeight - 2), paint);
      } else {
        // Bids
        paint.color = AppTheme.neonGreen.withOpacity(0.3);
        double barWidth = (level.bidVolume / maxVol) * (size.width * 0.3);
        canvas.drawRect(Rect.fromLTWH(size.width - barWidth, dy, barWidth, rowHeight - 2), paint);
      }
    }
    
    // Draw Current Price Line
    paint.color = Colors.white;
    paint.strokeWidth = 1;
    canvas.drawLine(Offset(0, centerY), Offset(size.width, centerY), paint);
    
    // Draw Bubbles (Simulated Trades)
    _drawTradeBubbles(canvas, size, centerY);
  }
  
  void _drawGrid(Canvas canvas, Size size) {
    final Paint p = Paint()
      ..color = Colors.white10
      ..strokeWidth = 1;
      
    // Vertical time lines
    for (double i = 0; i < size.width; i += 50) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), p);
    }
  }
  
  void _drawTradeBubbles(Canvas canvas, Size size, double centerY) {
    // Just drawing some random decorative bubbles for "Native Feel"
    // In real implementation this would use the TradeHistory list
    final rnd = DateTime.now().millisecondsSinceEpoch;
    final p = Paint()..style = PaintingStyle.fill;
    
    for (int i = 0; i < 5; i++) {
        double x = size.width * 0.8 - (i * 30);
        double y = centerY + (i % 2 == 0 ? 20 : -20);
        double r = (i % 3) * 3.0 + 2.0;
        
        p.color = i % 2 == 0 ? AppTheme.neonGreen : AppTheme.neonRed;
        canvas.drawCircle(Offset(x, y), r, p);
    }
  }

  @override
  bool shouldRepaint(covariant HeatmapPainter oldDelegate) {
    return true; // Always repaint for animation
  }
}
