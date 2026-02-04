import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../models/market_analysis.dart';
import '../widgets/glass_card.dart';

/// Widget to display market analysis result from AI
class AnalysisResultWidget extends StatelessWidget {
  final MarketAnalysis analysis;

  const AnalysisResultWidget({
    super.key,
    required this.analysis,
  });

  @override
  Widget build(BuildContext context) {
    final result = analysis.result;
    
    // Parse signal type from result
    final isBuy = result.toLowerCase().contains('buy');
    final isSell = result.toLowerCase().contains('sell') && !isBuy;
    final signalColor = isBuy ? AppTheme.neonGreen : isSell ? AppTheme.neonRed : Colors.grey;
    final signalText = isBuy ? 'BUY' : isSell ? 'SELL' : 'NEUTRAL';
    
    return GlassCard(
      opacity: 0.1,
      borderColor: signalColor.withOpacity(0.5),
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header with Gradient
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  signalColor.withOpacity(0.2),
                  signalColor.withOpacity(0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              border: const Border(
                bottom: BorderSide(color: Colors.white10),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: signalColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: signalColor.withOpacity(0.5)),
                      ),
                      child: Icon(
                        isBuy ? Icons.trending_up : isSell ? Icons.trending_down : Icons.remove,
                        color: signalColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'SIGNAL DETECTED',
                          style: TextStyle(
                            fontSize: 10,
                            letterSpacing: 1,
                            color: signalColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${analysis.pair} • ${analysis.timeframe.toUpperCase()}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: signalColor,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: signalColor.withOpacity(0.4),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: Text(
                    signalText,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Market Info
          if (analysis.marketInfo != null) ...[
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildInfoChip('PRICE', analysis.marketInfo!.price.toStringAsFixed(2), Colors.white),
                  Container(width: 1, height: 30, color: Colors.white10),
                  _buildInfoChip(
                    'CHANGE', 
                    '${analysis.marketInfo!.isPositive ? '+' : ''}${analysis.marketInfo!.change.toStringAsFixed(2)}%',
                    analysis.marketInfo!.isPositive ? AppTheme.neonGreen : AppTheme.neonRed,
                  ),
                  Container(width: 1, height: 30, color: Colors.white10),
                  _buildInfoChip(
                    'STATUS', 
                    analysis.marketInfo!.isRealtime ? 'LIVE' : 'DELAY',
                    analysis.marketInfo!.isRealtime ? AppTheme.neonBlue : Colors.amber,
                  ),
                ],
              ),
            ),
            const Divider(color: Colors.white10, height: 1),
          ],
          
          // Analysis Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: _buildAnalysisContent(result),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Colors.white54, letterSpacing: 1),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
            fontFamily: 'monospace',
          ),
        ),
      ],
    );
  }

  Widget _buildAnalysisContent(String htmlContent) {
    final sections = <Widget>[];
    final lines = htmlContent
        .replaceAll(RegExp(r'<[^>]+>'), '\n')
        .split('\n')
        .where((line) => line.trim().isNotEmpty)
        .toList();

    for (var line in lines) {
      line = line.trim();
      if (line.isEmpty) continue;
      
      // Check for signal indicators
      if (line.contains('📊') || line.contains('🎯') || line.contains('⚠️') || 
          line.contains('💡') || line.contains('📈') || line.contains('🚀')) {
        sections.add(
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 8),
            child: Row(
              children: [
                const Icon(Icons.arrow_right, color: AppTheme.neonBlue, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    line,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      } 
      // Entry / SL / TP boxes
      else if (line.contains('Entry') || line.contains('Stop Loss') || 
               line.contains('Take Profit') || line.contains('SL:') || 
               line.contains('TP:')) {
        final isEntry = line.contains('Entry');
        final isSL = line.contains('Stop Loss') || line.contains('SL:');
        final color = isEntry ? AppTheme.neonBlue : isSL ? AppTheme.neonRed : AppTheme.neonGreen;
        
        sections.add(
          Container(
            margin: const EdgeInsets.symmetric(vertical: 6),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Container(
                  width: 4, height: 4, decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    line,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: color,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }
      else {
        sections.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Text(
              line,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.white70,
                height: 1.6,
              ),
            ),
          ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: sections,
    );
  }
}
