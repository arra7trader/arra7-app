/// Market analysis result model
class MarketAnalysis {
  final String pair;
  final String timeframe;
  final String result;
  final MarketInfo? marketInfo;
  final DateTime analyzedAt;

  MarketAnalysis({
    required this.pair,
    required this.timeframe,
    required this.result,
    this.marketInfo,
    DateTime? analyzedAt,
  }) : analyzedAt = analyzedAt ?? DateTime.now();

  factory MarketAnalysis.fromJson(Map<String, dynamic> json) {
    return MarketAnalysis(
      pair: json['pair'] ?? '',
      timeframe: json['timeframe'] ?? '',
      result: json['result'] ?? '',
      marketInfo: json['marketInfo'] != null
          ? MarketInfo.fromJson(json['marketInfo'])
          : null,
    );
  }
}

/// Market info with price data
class MarketInfo {
  final String symbol;
  final String name;
  final double price;
  final double change;
  final bool isRealtime;

  MarketInfo({
    required this.symbol,
    required this.name,
    required this.price,
    required this.change,
    required this.isRealtime,
  });

  factory MarketInfo.fromJson(Map<String, dynamic> json) {
    return MarketInfo(
      symbol: json['symbol'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      change: (json['change'] ?? 0).toDouble(),
      isRealtime: json['isRealtime'] ?? false,
    );
  }

  bool get isPositive => change >= 0;
}

/// Parsed signal from AI analysis
class TradingSignal {
  final SignalType type;
  final String orderType;
  final double? entryPrice;
  final double? stopLoss;
  final double? takeProfit1;
  final double? takeProfit2;
  final String? reason;
  final String riskLevel;

  TradingSignal({
    required this.type,
    this.orderType = 'MARKET',
    this.entryPrice,
    this.stopLoss,
    this.takeProfit1,
    this.takeProfit2,
    this.reason,
    this.riskLevel = 'MID',
  });
}

enum SignalType { buy, sell, neutral }
