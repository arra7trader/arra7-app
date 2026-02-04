import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../services/stock_service.dart';
import '../models/stock_data.dart';
import '../models/user_model.dart';
import '../widgets/glass_card.dart';

class AnalisaSahamScreen extends StatefulWidget {
  const AnalisaSahamScreen({super.key});

  @override
  State<AnalisaSahamScreen> createState() => _AnalisaSahamScreenState();
}

class _AnalisaSahamScreenState extends State<AnalisaSahamScreen> {
  final StockService _stockService = StockService();
  final TextEditingController _symbolController = TextEditingController();
  
  StockData? _stockData;
  String? _analysis;
  bool _isLoading = false;
  bool _isAnalyzing = false;
  String? _error;
  QuotaStatus? _quota;

  @override
  void initState() {
    super.initState();
    _loadQuota();
  }

  Future<void> _loadQuota() async {
    final quota = await _stockService.getQuota();
    if (mounted) setState(() => _quota = quota);
  }

  Future<void> _searchStock(String symbol) async {
    if (symbol.isEmpty) return;
    FocusManager.instance.primaryFocus?.unfocus();
    
    setState(() {
      _isLoading = true;
      _error = null;
      _stockData = null;
      _analysis = null;
    });

    final result = await _stockService.getStockData(symbol);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (result.success && result.data != null) {
          _stockData = result.data;
        } else {
          _error = result.error ?? 'Stock not found';
        }
      });
    }
  }

  Future<void> _analyzeStock() async {
    if (_stockData == null) return;
    
    setState(() {
      _isAnalyzing = true;
      _error = null;
    });

    final result = await _stockService.analyzeStock(
      symbol: _stockData!.symbol,
      stockData: _stockData!,
    );

    if (mounted) {
      setState(() {
        _isAnalyzing = false;
        if (result.success && result.analysis != null) {
          _analysis = result.analysis;
        } else {
          _error = result.error ?? 'Analysis failed';
        }
      });
      _loadQuota();
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
                  child: SvgPicture.string(AppIcons.stock, width: 24, colorFilter: const ColorFilter.mode(AppTheme.neonGreen, BlendMode.srcIn)),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'IDX INTELLIGENCE',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Text(
                      'Institutional Stock Analysis',
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Search Box
                  GlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.search, color: Colors.white54),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _symbolController,
                            textCapitalization: TextCapitalization.characters,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                            decoration: const InputDecoration(
                              hintText: 'Enter Stock Code (e.g., BBCA)',
                              hintStyle: TextStyle(color: Colors.white30),
                              border: InputBorder.none,
                              filled: false,
                            ),
                            onSubmitted: _searchStock,
                          ),
                        ),
                        if (_isLoading)
                          const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.neonGreen))
                        else
                          IconButton(
                            icon: const Icon(Icons.arrow_forward_ios, color: AppTheme.neonGreen, size: 16),
                            onPressed: () => _searchStock(_symbolController.text),
                          ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Popular Stocks
                  if (_stockData == null) ...[
                    const Text(
                      'TRENDING STOCKS',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 1.5,
                        color: Colors.white54,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: PopularStocks.stocks.map((stock) {
                        return InkWell(
                          onTap: () {
                            _symbolController.text = stock['symbol']!;
                            _searchStock(stock['symbol']!);
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white10,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white10),
                            ),
                            child: Text(
                              stock['symbol']!,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 20),
                      child: Text(_error!, style: const TextStyle(color: AppTheme.neonRed)),
                    ),

                  // Stock Result
                  if (_stockData != null) ...[
                    _buildStockCard(_stockData!),
                    const SizedBox(height: 24),
                    
                    // Analyze Button
                    InkWell(
                      onTap: _isAnalyzing ? null : _analyzeStock,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        decoration: BoxDecoration(
                          gradient: _isAnalyzing ? null : AppTheme.greenGradient,
                          color: _isAnalyzing ? Colors.white10 : null,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: _isAnalyzing ? [] : [
                            BoxShadow(
                              color: AppTheme.neonGreen.withOpacity(0.3),
                              blurRadius: 20,
                              offset: const Offset(0, 5),
                            )
                          ],
                        ),
                        child: Center(
                          child: _isAnalyzing
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text(
                                'RUN AI ANALYSIS',
                                style: TextStyle(
                                  color: Colors.black, // Dark text on green for contrast
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  letterSpacing: 1,
                                ),
                              ),
                        ),
                      ),
                    ),
                  ],
                  
                  // Analysis Text
                  if (_analysis != null) ...[
                    const SizedBox(height: 24),
                    GlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              SvgPicture.string(AppIcons.aiRobot, width: 20, colorFilter: const ColorFilter.mode(AppTheme.neonGreen, BlendMode.srcIn)),
                              const SizedBox(width: 12),
                              const Text(
                                'AI INSIGHTS',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.neonGreen,
                                  letterSpacing: 1,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _analysis!,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.white70,
                              height: 1.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStockCard(StockData stock) {
    return GlassCard(
      borderRadius: 20,
      opacity: 0.1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stock.symbol,
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    stock.name,
                    style: const TextStyle(fontSize: 12, color: Colors.white54),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: (stock.isPositive ? AppTheme.neonGreen : AppTheme.neonRed).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: (stock.isPositive ? AppTheme.neonGreen : AppTheme.neonRed).withOpacity(0.5)),
                ),
                child: Text(
                  '${stock.isPositive ? '+' : ''}${stock.changePercent.toStringAsFixed(2)}%',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: stock.isPositive ? AppTheme.neonGreen : AppTheme.neonRed,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            stock.priceFormatted,
            style: const TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              _buildMetric('VOL', _formatVolume(stock.volume)),
              Container(width: 1, height: 30, color: Colors.white10),
              _buildMetric('CAP', stock.marketCapFormatted),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetric(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.white38)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
  
  String _formatVolume(int volume) {
    if (volume > 1000000) return '${(volume/1000000).toStringAsFixed(1)}M';
    if (volume > 1000) return '${(volume/1000).toStringAsFixed(1)}K';
    return volume.toString();
  }
}
