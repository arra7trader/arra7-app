import '../../../core/network/api_client.dart';
import '../domain/market_models.dart';

class MarketRepository {
  final ApiClient _apiClient;

  MarketRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<BootstrapData> fetchBootstrap({required String token}) async {
    final payload = await _apiClient.get(
      '/api/mobile/bootstrap',
      bearerToken: token,
      retries: 1,
    );
    return BootstrapData.fromJson(payload);
  }

  Future<AnalysisResult> analyze({
    required String token,
    required String pair,
    required String timeframe,
    String broker = 'swissquote',
  }) async {
    final payload = await _apiClient.post(
      '/api/analyze',
      bearerToken: token,
      body: {
        'pair': pair,
        'timeframe': timeframe,
        'broker': broker,
      },
      retries: 1,
    );

    final status = (payload['status'] ?? '').toString().toLowerCase();
    if (status == 'error') {
      throw ApiException((payload['message'] ?? 'Analisa gagal').toString());
    }

    final rawAnalysis = (payload['rawAnalysis'] ?? '').toString();
    final formatted = (payload['result'] ?? '').toString();
    final resultText = rawAnalysis.isNotEmpty ? rawAnalysis : _stripHtml(formatted);

    MarketSnapshot? marketInfo;
    final rawMarketInfo = payload['marketInfo'];
    if (rawMarketInfo is Map) {
      final map = Map<String, dynamic>.from(rawMarketInfo);
      marketInfo = MarketSnapshot(
        symbol: (map['symbol'] ?? pair).toString(),
        name: (map['name'] ?? pair).toString(),
        price: _toDouble(map['price']),
        change: _toDouble(map['change']),
        isRealtime: map['isRealtime'] == true,
      );
    }

    QuotaInfo? quota;
    final rawQuota = payload['quotaStatus'];
    if (rawQuota is Map) {
      quota = QuotaInfo.fromJson(Map<String, dynamic>.from(rawQuota));
    }

    ParsedSignal? parsedSignal;
    final rawSignal = payload['parsedSignal'];
    if (rawSignal is Map) {
      parsedSignal = ParsedSignal.fromJson(Map<String, dynamic>.from(rawSignal));
    }

    return AnalysisResult(
      text: resultText.trim(),
      rawAnalysis: rawAnalysis,
      marketInfo: marketInfo,
      quota: quota,
      signal: parsedSignal,
    );
  }

  Future<MarketSnapshot?> refreshMarket({
    required String pair,
    required String timeframe,
  }) async {
    try {
      final payload = await _apiClient.get(
        '/api/market',
        query: {
          'pair': pair,
          'timeframe': timeframe,
          'broker': 'swissquote',
        },
        retries: 1,
      );

      if ((payload['status'] ?? '').toString().toLowerCase() == 'error') {
        return null;
      }

      final data = payload['data'];
      if (data is! Map) return null;
      final map = Map<String, dynamic>.from(data);

      return MarketSnapshot(
        symbol: (map['symbol'] ?? pair).toString(),
        name: (map['name'] ?? pair).toString(),
        price: _toDouble(map['current_price']),
        change: _toDouble(map['change_percent']),
        isRealtime: map['is_realtime'] == true,
      );
    } catch (_) {
      return null;
    }
  }

  static String _stripHtml(String input) {
    return input
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll('&nbsp;', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }
}
