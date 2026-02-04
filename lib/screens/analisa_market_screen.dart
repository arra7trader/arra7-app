import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../services/market_service.dart';
import '../models/market_analysis.dart';
import '../models/user_model.dart'; // Added missing import
import '../constants/pairs_data.dart';
import '../widgets/glass_card.dart';
import '../widgets/analysis_result_widget.dart';
import '../widgets/quota_indicator.dart';

class AnalisaMarketScreen extends StatefulWidget {
  const AnalisaMarketScreen({super.key});

  @override
  State<AnalisaMarketScreen> createState() => _AnalisaMarketScreenState();
}

class _AnalisaMarketScreenState extends State<AnalisaMarketScreen> {
  final MarketService _marketService = MarketService();
  String _selectedCategory = 'commodities';
  String _selectedPair = 'XAUUSD';
  final String _selectedTimeframe = '1h';
  
  bool _isAnalyzing = false;
  MarketAnalysis? _analysisResult;
  String? _error;
  QuotaStatus? _quota;

  @override
  void initState() {
    super.initState();
    _loadQuota();
  }

  Future<void> _loadQuota() async {
    final quota = await _marketService.getQuota();
    if (mounted) setState(() => _quota = quota);
  }

  Future<void> _analyze() async {
    setState(() {
      _isAnalyzing = true;
      _error = null;
      _analysisResult = null;
    });

    final result = await _marketService.analyze(
      pair: _selectedPair,
      timeframe: _selectedTimeframe,
    );

    if (mounted) {
      setState(() {
        _isAnalyzing = false;
        if (result.success) {
          _analysisResult = result.analysis;
        } else {
          _error = result.error;
        }
        if (result.quotaStatus != null) _quota = result.quotaStatus;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                GlassCard(
                  borderRadius: 12,
                  padding: const EdgeInsets.all(10),
                  child: SvgPicture.string(AppIcons.market, width: 24, colorFilter: const ColorFilter.mode(AppTheme.neonBlue, BlendMode.srcIn)),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MARKET INTELLIGENCE',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Text(
                      'AI-Powered Signal Generator',
                      style: TextStyle(color: Colors.white54, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_quota != null) QuotaIndicator(quota: _quota!),
                  const SizedBox(height: 24),
                  
                  // Category Selection
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: PairsData.categories.map((cat) {
                        final isSelected = _selectedCategory == cat.id;
                        return Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: InkWell(
                            onTap: () => setState(() {
                              _selectedCategory = cat.id;
                              _selectedPair = cat.pairs.first.value;
                            }),
                            borderRadius: BorderRadius.circular(20),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? AppTheme.neonBlue : Colors.transparent,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: isSelected ? AppTheme.neonBlue : Colors.white24),
                              ),
                              child: Text(
                                cat.name,
                                style: TextStyle(
                                  color: isSelected ? Colors.black : Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Pair Grid
                  GlassCard(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: PairsData.categories
                          .firstWhere((c) => c.id == _selectedCategory)
                          .pairs
                          .map((pair) {
                        final isSelected = _selectedPair == pair.value;
                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => setState(() => _selectedPair = pair.value),
                            borderRadius: BorderRadius.circular(8),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? AppTheme.neonBlue.withOpacity(0.2) : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: isSelected ? AppTheme.neonBlue : Colors.white10),
                              ),
                              child: Text(
                                pair.label,
                                style: TextStyle(
                                  color: isSelected ? AppTheme.neonBlue : Colors.white70,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const SizedBox(height: 24),
                  
                  // Large Action Button
                  InkWell(
                    onTap: _isAnalyzing ? null : _analyze,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      decoration: BoxDecoration(
                        gradient: _isAnalyzing 
                            ? const LinearGradient(colors: [Colors.white10, Colors.white10]) 
                            : AppTheme.cyberGradient,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: _isAnalyzing ? [] : [
                          BoxShadow(
                            color: AppTheme.neonBlue.withOpacity(0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 5),
                          )
                        ],
                      ),
                      child: Center(
                        child: _isAnalyzing
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SvgPicture.string(AppIcons.aiRobot, width: 24, colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn)),
                                  const SizedBox(width: 12),
                                  const Text(
                                    'GENERATE SIGNAL',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      letterSpacing: 1,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),
                  
                  if (_analysisResult != null && !_isAnalyzing) ...[
                    const SizedBox(height: 24),
                    AnalysisResultWidget(analysis: _analysisResult!),
                  ],

                  const SizedBox(height: 100), // Bottom padding
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
