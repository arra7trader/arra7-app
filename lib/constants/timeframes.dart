/// Timeframe options for market analysis
class TimeframesData {
  static const List<Timeframe> timeframes = [
    Timeframe(value: '1m', label: 'M1', description: '1 Minute'),
    Timeframe(value: '5m', label: 'M5', description: '5 Minutes'),
    Timeframe(value: '15m', label: 'M15', description: '15 Minutes'),
    Timeframe(value: '30m', label: 'M30', description: '30 Minutes'),
    Timeframe(value: '1h', label: 'H1', description: '1 Hour'),
    Timeframe(value: '4h', label: 'H4', description: '4 Hours'),
    Timeframe(value: '1d', label: 'D1', description: 'Daily'),
  ];
}

class Timeframe {
  final String value;
  final String label;
  final String description;

  const Timeframe({
    required this.value,
    required this.label,
    required this.description,
  });
}
