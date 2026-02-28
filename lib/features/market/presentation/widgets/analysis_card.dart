import 'package:flutter/material.dart';
import '../../../../core/theme/design_tokens.dart';
import '../../domain/market_models.dart';

class AnalysisCard extends StatelessWidget {
  final AnalysisResult analysis;

  const AnalysisCard({
    super.key,
    required this.analysis,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final market = analysis.marketInfo;
    final priceText = market != null ? market.price.toStringAsFixed(4) : '-';
    final changeText = market != null ? '${market.change.toStringAsFixed(2)}%' : '-';
    final sections = _buildSections(analysis.text);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Hasil Analisa',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                if (market != null)
                  Chip(
                    label: Text(market.isRealtime ? 'REALTIME' : 'DELAYED'),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (market != null)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MetricChip(label: '${market.symbol}  $priceText'),
                  _MetricChip(
                    label: changeText,
                    color: market.change >= 0
                        ? Colors.green.shade600
                        : Colors.red.shade400,
                  ),
                ],
              ),
            if (analysis.signal != null && analysis.signal!.isTradable) ...[
              const SizedBox(height: 12),
              _SignalSummaryCard(signal: analysis.signal!),
            ],
            const SizedBox(height: 12),
            if (sections.isEmpty)
              Text(
                'Tidak ada hasil analisa.',
                style: theme.textTheme.bodyMedium,
              )
            else
              Column(
                children: sections
                    .map(
                      (section) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _SectionCard(
                          section: section,
                          isDark: isDark,
                        ),
                      ),
                    )
                    .toList(),
              ),
          ],
        ),
      ),
    );
  }

  static List<_AnalysisSection> _buildSections(String rawText) {
    final lines = rawText.replaceAll('\r\n', '\n').split('\n');
    final sections = <_AnalysisSection>[];
    var currentTitle = 'Ringkasan';
    final currentLines = <String>[];

    void pushSection() {
      if (currentLines.isEmpty) return;
      sections.add(
        _AnalysisSection(
          title: currentTitle,
          lines: List<String>.from(currentLines),
        ),
      );
      currentLines.clear();
    }

    for (final raw in lines) {
      final trimmed = raw.trim();
      if (trimmed.isEmpty) continue;
      if (RegExp(r'^[\-=─_]{3,}$').hasMatch(trimmed)) continue;

      final cleaned = _cleanText(trimmed);
      if (cleaned.isEmpty) continue;

      if (_isHeading(trimmed, cleaned)) {
        pushSection();
        currentTitle = _cleanHeading(cleaned);
        continue;
      }

      currentLines.add(cleaned);
    }

    pushSection();

    if (sections.isEmpty && rawText.trim().isNotEmpty) {
      return [
        _AnalysisSection(
          title: 'Ringkasan',
          lines: [_cleanText(rawText)],
        ),
      ];
    }
    return sections;
  }

  static bool _isHeading(String original, String cleaned) {
    final lower = cleaned.toLowerCase();
    if (original.startsWith('#')) return true;

    if (RegExp(r'^(tp\d?|sl|entry)\s*[:\-]', caseSensitive: false).hasMatch(lower)) {
      return false;
    }

    const keywords = [
      'arra quantum',
      'execution strategy',
      'action call',
      'stop loss',
      'take profit',
      'risk management',
      'entry',
      'rekomendasi',
      'kesimpulan',
    ];

    if (keywords.any((keyword) => lower.contains(keyword)) && cleaned.length <= 64) {
      return true;
    }

    if (original.contains('*') && cleaned.split(' ').length <= 8 && cleaned.length <= 64) {
      return true;
    }

    final letters = cleaned.replaceAll(RegExp(r'[^A-Za-z]'), '');
    if (letters.length >= 8) {
      final upper = letters.replaceAll(RegExp(r'[^A-Z]'), '').length;
      final ratio = upper / letters.length;
      if (ratio > 0.75 && cleaned.split(' ').length <= 8) return true;
    }

    return false;
  }

  static String _cleanHeading(String input) {
    var value = input;
    value = value.replaceFirst(RegExp(r'^[^A-Za-z0-9]+'), '');
    return value.trim();
  }

  static String _cleanText(String input) {
    var value = input;
    value = value.replaceAll('**', '');
    value = value.replaceAll('*', '');
    value = value.replaceAll('`', '');
    value = value.replaceFirst(RegExp(r'^[\-\u2022]\s*'), '');
    value = value.replaceAll(RegExp(r'\s+'), ' ').trim();
    return value;
  }
}

class _MetricChip extends StatelessWidget {
  final String label;
  final Color? color;

  const _MetricChip({
    required this.label,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.25)),
        color: theme.colorScheme.surface.withOpacity(0.18),
      ),
      child: Text(
        label,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w700,
          color: color ?? theme.textTheme.bodyMedium?.color,
        ),
      ),
    );
  }
}

class _SignalSummaryCard extends StatelessWidget {
  final ParsedSignal signal;

  const _SignalSummaryCard({required this.signal});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final confidence = signal.confidence;
    final confidencePct = confidence == null
        ? null
        : confidence <= 1
            ? confidence * 100
            : confidence;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: theme.colorScheme.primary.withOpacity(0.09),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Signal Cepat',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MetricChip(label: 'Aksi: ${signal.direction}'),
              if (signal.entryPrice != null)
                _MetricChip(label: 'Entry: ${_formatPrice(signal.entryPrice!)}'),
              if (signal.stopLoss != null && signal.stopLoss! > 0)
                _MetricChip(label: 'SL: ${_formatPrice(signal.stopLoss!)}'),
              if (signal.takeProfit1 != null && signal.takeProfit1! > 0)
                _MetricChip(label: 'TP1: ${_formatPrice(signal.takeProfit1!)}'),
              if (signal.takeProfit2 != null && signal.takeProfit2! > 0)
                _MetricChip(label: 'TP2: ${_formatPrice(signal.takeProfit2!)}'),
              if (confidencePct != null && confidencePct > 0)
                _MetricChip(label: 'Confidence: ${confidencePct.toStringAsFixed(1)}%'),
            ],
          ),
        ],
      ),
    );
  }

  static String _formatPrice(double value) {
    final abs = value.abs();
    if (abs >= 100) return value.toStringAsFixed(2);
    if (abs >= 1) return value.toStringAsFixed(4);
    return value.toStringAsFixed(5);
  }
}

class _SectionCard extends StatelessWidget {
  final _AnalysisSection section;
  final bool isDark;

  const _SectionCard({
    required this.section,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111B33) : const Color(0xFFF8FAFF),
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _iconForTitle(section.title),
                size: 18,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  section.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...section.lines.map(
            (line) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 5,
                    height: 5,
                    margin: const EdgeInsets.only(top: 7, right: 8),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: theme.colorScheme.primary.withOpacity(0.7),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      line,
                      style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static IconData _iconForTitle(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('action') || lower.contains('call')) return Icons.flash_on_rounded;
    if (lower.contains('entry')) return Icons.pin_drop_rounded;
    if (lower.contains('stop loss')) return Icons.shield_rounded;
    if (lower.contains('take profit')) return Icons.gps_fixed_rounded;
    if (lower.contains('risk')) return Icons.warning_amber_rounded;
    return Icons.article_outlined;
  }
}

class _AnalysisSection {
  final String title;
  final List<String> lines;

  const _AnalysisSection({
    required this.title,
    required this.lines,
  });
}
