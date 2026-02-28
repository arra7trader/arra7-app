import 'package:flutter/material.dart';
import '../../../market/domain/market_models.dart';

class QuotaCard extends StatelessWidget {
  final QuotaInfo quota;

  const QuotaCard({
    super.key,
    required this.quota,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kuota Analisa', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 10),
            if (quota.isUnlimited) ...[
              const Text('Unlimited'),
            ] else ...[
              _RowItem(label: 'Harian', value: quota.dailyLimit.toString()),
              _RowItem(label: 'Terpakai', value: quota.used.toString()),
              _RowItem(label: 'Sisa', value: quota.remaining.toString()),
            ],
            _RowItem(label: 'Status', value: quota.canAnalyze ? 'Bisa Analisa' : 'Limit Habis'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: quota.allowedTimeframes
                  .map((timeframe) => Chip(label: Text(timeframe.toUpperCase())))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _RowItem extends StatelessWidget {
  final String label;
  final String value;

  const _RowItem({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
