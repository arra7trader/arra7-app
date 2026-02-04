import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../widgets/glass_card.dart';
import '../services/depth_engine.dart';
import '../widgets/heatmap_painter.dart';

class DepthMatrixScreen extends StatefulWidget {
  const DepthMatrixScreen({super.key});

  @override
  State<DepthMatrixScreen> createState() => _DepthMatrixScreenState();
}

class _DepthMatrixScreenState extends State<DepthMatrixScreen> {
  final DepthEngine _engine = DepthEngine();
  String _selectedSymbol = 'XAUUSD';

  @override
  void initState() {
    super.initState();
    _engine.addListener(_onEngineUpdate);
    // Auto-connect to fix "connecting..." issue
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) _engine.start();
    });
  }

  @override
  void dispose() {
    _engine.removeListener(_onEngineUpdate);
    _engine.stop();
    super.dispose();
  }

  void _onEngineUpdate() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: [
                GlassCard(
                  borderRadius: 12,
                  padding: const EdgeInsets.all(10),
                  child: SvgPicture.string(AppIcons.depth, width: 24, colorFilter: const ColorFilter.mode(AppTheme.neonGold, BlendMode.srcIn)),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DEPTH MATRIX',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Row(
                      children: [
                        Container(
                          width: 8, height: 8, 
                          decoration: BoxDecoration(color: _engine.isConnected ? AppTheme.neonGreen : Colors.red, shape: BoxShape.circle)
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _engine.isConnected ? 'SYSTEM ONLINE' : 'CONNECTING...',
                          style: TextStyle(
                            color: _engine.isConnected ? AppTheme.neonGreen : Colors.red,
                            fontSize: 10, 
                            fontWeight: FontWeight.bold
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Symbol Selector
          SizedBox(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'DJ30'].map((symbol) {
                final isSelected = _selectedSymbol == symbol;
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: InkWell(
                    onTap: () {
                      setState(() => _selectedSymbol = symbol);
                      _engine.stop();
                      _engine.start(); // Restart engine for new symbol
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border.all(color: isSelected ? AppTheme.neonGold : Colors.white10),
                        borderRadius: BorderRadius.circular(12),
                        color: isSelected ? AppTheme.neonGold.withOpacity(0.1) : Colors.transparent,
                      ),
                      child: Text(
                        symbol,
                        style: TextStyle(
                          color: isSelected ? AppTheme.neonGold : Colors.white54,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          
          const SizedBox(height: 12),
          
          // Main Heatmap Area
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white10),
                borderRadius: BorderRadius.circular(4),
                color: Colors.black,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: Stack(
                  children: [
                    // The Painter
                    CustomPaint(
                      painter: HeatmapPainter(
                        levels: _engine.levels,
                        currentPrice: _engine.currentPrice,
                        maxVol: _engine.maxVolume,
                      ),
                      child: Container(),
                    ),
                    
                    // Current Price Label (Floating)
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black87,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Text(
                          _engine.currentPrice.toStringAsFixed(2),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'monospace',
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),

                    // Controls Overlay
                    Positioned(
                      right: 12,
                      bottom: 12,
                      child: Column(
                        children: [
                           _buildControlButton(Icons.add, () {}),
                           const SizedBox(height: 8),
                           _buildControlButton(Icons.remove, () {}),
                           const SizedBox(height: 8),
                           _buildControlButton(Icons.refresh, () {
                             _engine.stop();
                             _engine.start();
                           }),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Footer Stats
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStat('LIQUIDITY', 'HIGH'),
                _buildStat('Sentiment', 'BULLISH'),
                _buildStat('Next Level', '2660.00'),
              ],
            ),
          ),
          
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildControlButton(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: const BoxDecoration(
          color: Colors.white10,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.white38)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
      ],
    );
  }
}
