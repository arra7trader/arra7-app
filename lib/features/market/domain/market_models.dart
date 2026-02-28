class AppUser {
  final String id;
  final String email;
  final String? name;
  final String? image;
  final String tier;

  const AppUser({
    required this.id,
    required this.email,
    this.name,
    this.image,
    required this.tier,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      name: json['name']?.toString(),
      image: json['image']?.toString(),
      tier: (json['tier'] ?? json['membership'] ?? 'BASIC').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'image': image,
        'tier': tier,
      };
}

class QuotaInfo {
  final String membership;
  final int dailyLimit;
  final int used;
  final int remaining;
  final bool canAnalyze;
  final List<String> allowedTimeframes;

  const QuotaInfo({
    required this.membership,
    required this.dailyLimit,
    required this.used,
    required this.remaining,
    required this.canAnalyze,
    required this.allowedTimeframes,
  });

  bool get isUnlimited => dailyLimit < 0;

  factory QuotaInfo.fromJson(Map<String, dynamic> json) {
    final rawFrames = json['allowedTimeframes'];
    final frames = rawFrames is List
        ? rawFrames.map((e) => e.toString()).toList()
        : const <String>['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

    return QuotaInfo(
      membership: (json['membership'] ?? 'BASIC').toString(),
      dailyLimit: _toInt(json['dailyLimit'], -1),
      used: _toInt(json['used'], 0),
      remaining: _toInt(json['remaining'], -1),
      canAnalyze: json['canAnalyze'] == true,
      allowedTimeframes: frames,
    );
  }

  static int _toInt(dynamic value, int fallback) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }
}

class PairOption {
  final String value;
  final String label;

  const PairOption({
    required this.value,
    required this.label,
  });

  factory PairOption.fromJson(Map<String, dynamic> json) {
    return PairOption(
      value: (json['value'] ?? '').toString(),
      label: (json['label'] ?? '').toString(),
    );
  }
}

class MarketCategory {
  final String id;
  final String name;
  final List<PairOption> pairs;

  const MarketCategory({
    required this.id,
    required this.name,
    required this.pairs,
  });

  factory MarketCategory.fromJson(Map<String, dynamic> json) {
    final rawPairs = json['pairs'];
    final pairs = rawPairs is List
        ? rawPairs
            .whereType<Map>()
            .map((pair) => PairOption.fromJson(Map<String, dynamic>.from(pair)))
            .toList()
        : <PairOption>[];

    return MarketCategory(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      pairs: pairs,
    );
  }
}

class TimeframeOption {
  final String value;
  final String label;

  const TimeframeOption({
    required this.value,
    required this.label,
  });

  factory TimeframeOption.fromJson(Map<String, dynamic> json) {
    return TimeframeOption(
      value: (json['value'] ?? '').toString(),
      label: (json['label'] ?? '').toString(),
    );
  }
}

class MarketConfig {
  final List<MarketCategory> categories;
  final List<TimeframeOption> timeframes;
  final String defaultPair;
  final String defaultTimeframe;

  const MarketConfig({
    required this.categories,
    required this.timeframes,
    required this.defaultPair,
    required this.defaultTimeframe,
  });

  factory MarketConfig.fromJson(Map<String, dynamic> json) {
    final rawCategories = json['categories'];
    final rawTimeframes = json['timeframes'];

    final categories = rawCategories is List
        ? rawCategories
            .whereType<Map>()
            .map((category) => MarketCategory.fromJson(Map<String, dynamic>.from(category)))
            .toList()
        : <MarketCategory>[];

    final timeframes = rawTimeframes is List
        ? rawTimeframes
            .whereType<Map>()
            .map((timeframe) => TimeframeOption.fromJson(Map<String, dynamic>.from(timeframe)))
            .toList()
        : <TimeframeOption>[];

    return MarketConfig(
      categories: categories,
      timeframes: timeframes,
      defaultPair: (json['defaultPair'] ?? 'XAUUSD').toString(),
      defaultTimeframe: (json['defaultTimeframe'] ?? '1h').toString(),
    );
  }
}

class BootstrapData {
  final AppUser user;
  final QuotaInfo quota;
  final MarketConfig marketConfig;

  const BootstrapData({
    required this.user,
    required this.quota,
    required this.marketConfig,
  });

  factory BootstrapData.fromJson(Map<String, dynamic> json) {
    return BootstrapData(
      user: AppUser.fromJson((json['user'] as Map<String, dynamic>?) ?? <String, dynamic>{}),
      quota: QuotaInfo.fromJson((json['quota'] as Map<String, dynamic>?) ?? <String, dynamic>{}),
      marketConfig: MarketConfig.fromJson(
        (json['marketConfig'] as Map<String, dynamic>?) ?? <String, dynamic>{},
      ),
    );
  }
}

class MarketSnapshot {
  final String symbol;
  final String name;
  final double price;
  final double change;
  final bool isRealtime;

  const MarketSnapshot({
    required this.symbol,
    required this.name,
    required this.price,
    required this.change,
    required this.isRealtime,
  });
}

class AnalysisResult {
  final String text;
  final String rawAnalysis;
  final MarketSnapshot? marketInfo;
  final QuotaInfo? quota;
  final ParsedSignal? signal;

  const AnalysisResult({
    required this.text,
    required this.rawAnalysis,
    this.marketInfo,
    this.quota,
    this.signal,
  });
}

class ParsedSignal {
  final String direction;
  final double? entryPrice;
  final double? stopLoss;
  final double? takeProfit1;
  final double? takeProfit2;
  final double? confidence;

  const ParsedSignal({
    required this.direction,
    this.entryPrice,
    this.stopLoss,
    this.takeProfit1,
    this.takeProfit2,
    this.confidence,
  });

  bool get isTradable => direction == 'BUY' || direction == 'SELL';

  factory ParsedSignal.fromJson(Map<String, dynamic> json) {
    final direction = (json['direction'] ?? json['type'] ?? '')
        .toString()
        .toUpperCase();
    return ParsedSignal(
      direction: direction,
      entryPrice: _toDouble(json['entryPrice'] ?? json['entry']),
      stopLoss: _toDouble(json['stopLoss'] ?? json['sl']),
      takeProfit1: _toDouble(json['takeProfit1'] ?? json['tp']),
      takeProfit2: _toDouble(json['takeProfit2']),
      confidence: _toDouble(json['confidence']),
    );
  }

  static double? _toDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }
}
