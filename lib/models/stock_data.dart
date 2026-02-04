/// Stock data model for IDX stocks
class StockData {
  final String symbol;
  final String name;
  final double currentPrice;
  final double previousClose;
  final double change;
  final double changePercent;
  final double high52Week;
  final double low52Week;
  final int volume;
  final int avgVolume;
  final double? marketCap;
  final List<HistoricalPrice> historicalData;

  StockData({
    required this.symbol,
    required this.name,
    required this.currentPrice,
    required this.previousClose,
    required this.change,
    required this.changePercent,
    required this.high52Week,
    required this.low52Week,
    required this.volume,
    required this.avgVolume,
    this.marketCap,
    this.historicalData = const [],
  });

  factory StockData.fromJson(Map<String, dynamic> json) {
    return StockData(
      symbol: json['symbol'] ?? '',
      name: json['name'] ?? '',
      currentPrice: (json['currentPrice'] ?? 0).toDouble(),
      previousClose: (json['previousClose'] ?? 0).toDouble(),
      change: (json['change'] ?? 0).toDouble(),
      changePercent: (json['changePercent'] ?? 0).toDouble(),
      high52Week: (json['high52Week'] ?? 0).toDouble(),
      low52Week: (json['low52Week'] ?? 0).toDouble(),
      volume: json['volume'] ?? 0,
      avgVolume: json['avgVolume'] ?? 0,
      marketCap: json['marketCap']?.toDouble(),
      historicalData: json['historicalData'] != null
          ? (json['historicalData'] as List)
              .map((e) => HistoricalPrice.fromJson(e))
              .toList()
          : [],
    );
  }

  bool get isPositive => change >= 0;
  
  String get priceFormatted => 'Rp ${currentPrice.toStringAsFixed(0).replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (match) => '${match[1]}.',
  )}';
  
  String get marketCapFormatted {
    if (marketCap == null) return 'N/A';
    if (marketCap! >= 1e12) {
      return 'Rp ${(marketCap! / 1e12).toStringAsFixed(2)}T';
    } else if (marketCap! >= 1e9) {
      return 'Rp ${(marketCap! / 1e9).toStringAsFixed(2)}B';
    }
    return 'Rp ${(marketCap! / 1e6).toStringAsFixed(2)}M';
  }
}

class HistoricalPrice {
  final DateTime date;
  final double close;

  HistoricalPrice({
    required this.date,
    required this.close,
  });

  factory HistoricalPrice.fromJson(Map<String, dynamic> json) {
    return HistoricalPrice(
      date: DateTime.parse(json['date']),
      close: (json['close'] ?? 0).toDouble(),
    );
  }
}

/// Popular IDX stocks for quick selection
class PopularStocks {
  static const List<Map<String, String>> stocks = [
    {'symbol': 'BBCA', 'name': 'Bank Central Asia'},
    {'symbol': 'BBRI', 'name': 'Bank Rakyat Indonesia'},
    {'symbol': 'BMRI', 'name': 'Bank Mandiri'},
    {'symbol': 'TLKM', 'name': 'Telkom Indonesia'},
    {'symbol': 'ASII', 'name': 'Astra International'},
    {'symbol': 'UNVR', 'name': 'Unilever Indonesia'},
    {'symbol': 'GOTO', 'name': 'GoTo Gojek Tokopedia'},
    {'symbol': 'BREN', 'name': 'Barito Renewables'},
    {'symbol': 'AMMN', 'name': 'Amman Mineral'},
    {'symbol': 'ANTM', 'name': 'Aneka Tambang'},
  ];
}
