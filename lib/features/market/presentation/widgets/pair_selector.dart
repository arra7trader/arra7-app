import 'package:flutter/material.dart';
import '../../domain/market_models.dart';

class PairSelector extends StatelessWidget {
  final List<MarketCategory> categories;
  final String selectedCategoryId;
  final String selectedPair;
  final ValueChanged<String> onCategoryChanged;
  final ValueChanged<String> onPairChanged;

  const PairSelector({
    super.key,
    required this.categories,
    required this.selectedCategoryId,
    required this.selectedPair,
    required this.onCategoryChanged,
    required this.onPairChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selectedCategory = categories.firstWhere(
      (category) => category.id == selectedCategoryId,
      orElse: () => categories.first,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Kategori', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: categories.map((category) {
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(category.name),
                  selected: category.id == selectedCategoryId,
                  onSelected: (_) => onCategoryChanged(category.id),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),
        Text('Pair', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: selectedCategory.pairs.map((pair) {
            return ChoiceChip(
              label: Text(pair.label),
              selected: pair.value == selectedPair,
              onSelected: (_) => onPairChanged(pair.value),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class TimeframeSelector extends StatelessWidget {
  final List<TimeframeOption> timeframes;
  final String selectedTimeframe;
  final ValueChanged<String> onTimeframeChanged;

  const TimeframeSelector({
    super.key,
    required this.timeframes,
    required this.selectedTimeframe,
    required this.onTimeframeChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: timeframes.map((timeframe) {
        return ChoiceChip(
          label: Text(timeframe.value.toUpperCase()),
          selected: timeframe.value == selectedTimeframe,
          onSelected: (_) => onTimeframeChanged(timeframe.value),
        );
      }).toList(),
    );
  }
}
