import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/brand_logo.dart';
import '../../../core/widgets/error_state.dart';
import '../../../core/widgets/loading_state.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/market_repository.dart';
import '../domain/market_models.dart';
import 'widgets/analysis_card.dart';
import 'widgets/pair_selector.dart';

class MarketScreen extends StatefulWidget {
  final bool isActive;

  const MarketScreen({
    super.key,
    required this.isActive,
  });

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  final MarketRepository _repository = MarketRepository();
  Timer? _pollingTimer;

  bool _loading = true;
  bool _analyzing = false;
  String? _errorMessage;

  List<MarketCategory> _categories = const [];
  List<TimeframeOption> _timeframes = const [];
  QuotaInfo? _quota;
  MarketSnapshot? _snapshot;
  AnalysisResult? _analysis;

  String _selectedCategory = 'commodities';
  String _selectedPair = 'XAUUSD';
  String _selectedTimeframe = '1h';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBootstrap();
    });
  }

  @override
  void didUpdateWidget(covariant MarketScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive == oldWidget.isActive) return;
    if (widget.isActive) {
      _startPolling();
      _refreshPrice();
    } else {
      _stopPolling();
    }
  }

  @override
  void dispose() {
    _stopPolling();
    super.dispose();
  }

  Future<void> _loadBootstrap() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    final auth = context.read<AuthController>();
    try {
      if (auth.marketConfig == null || auth.quota == null) {
        await auth.refreshBootstrap(silent: true);
      }

      final config = auth.marketConfig;
      final quota = auth.quota;

      if (!mounted) return;
      if (config == null || config.categories.isEmpty) {
        setState(() {
          _loading = false;
          _errorMessage = 'Konfigurasi market tidak tersedia.';
        });
        return;
      }

      final category = config.categories.firstWhere(
        (element) => element.id == _selectedCategory,
        orElse: () => config.categories.first,
      );

      setState(() {
        _categories = config.categories;
        _timeframes = config.timeframes.isEmpty
            ? const [TimeframeOption(value: '1h', label: '1 Hour')]
            : config.timeframes;
        _quota = quota;
        _selectedCategory = category.id;
        _selectedPair = category.pairs.isNotEmpty ? category.pairs.first.value : config.defaultPair;
        _selectedTimeframe = config.defaultTimeframe;
        _loading = false;
      });

      await _refreshPrice();
      if (widget.isActive) _startPolling();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _errorMessage = 'Gagal memuat data market.';
      });
    }
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      _refreshPrice();
    });
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> _refreshPrice() async {
    final snapshot = await _repository.refreshMarket(
      pair: _selectedPair,
      timeframe: _selectedTimeframe,
    );
    if (!mounted || snapshot == null) return;
    setState(() => _snapshot = snapshot);
  }

  Future<void> _runAnalysis() async {
    final token = context.read<AuthController>().accessToken;
    if (token == null || token.isEmpty) return;

    if (_quota != null && !_quota!.canAnalyze) {
      setState(() => _errorMessage = 'Kuota analisa habis untuk hari ini.');
      return;
    }

    setState(() {
      _analyzing = true;
      _errorMessage = null;
    });

    try {
      final result = await _repository.analyze(
        token: token,
        pair: _selectedPair,
        timeframe: _selectedTimeframe,
      );

      if (!mounted) return;
      setState(() {
        _analysis = result;
        if (result.quota != null) _quota = result.quota;
      });
    } catch (error) {
      if (!mounted) return;
      final message = error.toString();
      final lowered = message.toLowerCase();
      if (lowered.contains('unauthorized') || lowered.contains('401')) {
        await context.read<AuthController>().signOut();
        return;
      }
      setState(() {
        _errorMessage = message.replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _analyzing = false);
      }
    }
  }

  void _onCategoryChanged(String categoryId) {
    if (_categories.isEmpty) return;
    final category = _categories.firstWhere(
      (element) => element.id == categoryId,
      orElse: () => _categories.first,
    );

    setState(() {
      _selectedCategory = categoryId;
      _selectedPair = category.pairs.isNotEmpty ? category.pairs.first.value : _selectedPair;
      _analysis = null;
    });

    _refreshPrice();
  }

  EdgeInsets _resolvePadding(double width) {
    if (width < DesignTokens.compactBreakpoint) return DesignTokens.pagePaddingCompact;
    if (width < DesignTokens.mediumBreakpoint) return DesignTokens.pagePaddingMedium;
    return DesignTokens.pagePaddingLarge;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: LoadingState(message: 'Memuat market...'),
        ),
      );
    }

    if (_errorMessage != null && _categories.isEmpty) {
      return Scaffold(
        body: ErrorState(
          message: _errorMessage!,
          onRetry: _loadBootstrap,
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final padding = _resolvePadding(constraints.maxWidth);
        final contentMaxWidth = constraints.maxWidth > 920 ? 900.0 : double.infinity;

        return Scaffold(
          appBar: AppBar(
            leading: const BrandAppBarLogo(),
            title: const Text('Analisa Market'),
            actions: [
              IconButton(
                tooltip: 'Refresh Harga',
                onPressed: _refreshPrice,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          body: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth),
              child: RefreshIndicator(
                onRefresh: () async {
                  await _refreshPrice();
                  await context.read<AuthController>().refreshBootstrap(silent: true);
                },
                child: ListView(
                  padding: padding,
                  children: [
                    _MarketHeader(snapshot: _snapshot, quota: _quota),
                    const SizedBox(height: 16),
                    PairSelector(
                      categories: _categories,
                      selectedCategoryId: _selectedCategory,
                      selectedPair: _selectedPair,
                      onCategoryChanged: _onCategoryChanged,
                      onPairChanged: (pair) {
                        setState(() {
                          _selectedPair = pair;
                          _analysis = null;
                        });
                        _refreshPrice();
                      },
                    ),
                    const SizedBox(height: 14),
                    Text('Timeframe', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 10),
                    TimeframeSelector(
                      timeframes: _timeframes,
                      selectedTimeframe: _selectedTimeframe,
                      onTimeframeChanged: (value) {
                        setState(() {
                          _selectedTimeframe = value;
                          _analysis = null;
                        });
                        _refreshPrice();
                      },
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _analyzing ? null : _runAnalysis,
                      icon: _analyzing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.auto_graph_rounded),
                      label: Text(_analyzing ? 'Menganalisa...' : 'Analisa Sekarang'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _errorMessage!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error),
                      ),
                    ],
                    if (_analysis != null) ...[
                      const SizedBox(height: 16),
                      AnalysisCard(analysis: _analysis!),
                    ],
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _MarketHeader extends StatelessWidget {
  final MarketSnapshot? snapshot;
  final QuotaInfo? quota;

  const _MarketHeader({
    required this.snapshot,
    required this.quota,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final symbol = snapshot?.symbol ?? 'PAIR';
    final price = snapshot?.price ?? 0;
    final change = snapshot?.change ?? 0;
    final sign = change >= 0 ? '+' : '';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(symbol, style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              price == 0 ? '-' : price.toStringAsFixed(4),
              style: theme.textTheme.headlineSmall,
            ),
            Text(
              '$sign${change.toStringAsFixed(2)}%',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: change >= 0 ? Colors.green : Colors.red,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(
                  label: Text(snapshot?.isRealtime == true ? 'Data Realtime' : 'Data Delayed'),
                ),
                if (quota != null)
                  Chip(
                    label: Text(
                      quota!.isUnlimited
                          ? 'Kuota Unlimited'
                          : 'Sisa Kuota: ${quota!.remaining}',
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
