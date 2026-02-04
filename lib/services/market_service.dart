import '../models/market_analysis.dart';
import '../models/user_model.dart';
import 'api_client.dart';
import '../constants/api_endpoints.dart';

/// Service for market analysis API calls
class MarketService {
  final ApiClient _api = ApiClient();

  /// Get user quota status
  Future<QuotaStatus?> getQuota() async {
    try {
      final response = await _api.get(ApiEndpoints.userQuota);
      
      if (response.success && response.data != null) {
        final quotaData = response.data['quota'] ?? response.data;
        return QuotaStatus.fromJson(quotaData);
      }
    } catch (e) {
      // Return default quota for demo
    }
    
    // Default quota for demo mode
    return QuotaStatus(
      membership: 'BASIC',
      dailyLimit: 5,
      used: 0,
      remaining: 5,
      canAnalyze: true,
    );
  }

  /// Analyze market pair with AI
  Future<MarketAnalysisResult> analyze({
    required String pair,
    required String timeframe,
  }) async {
    try {
      final response = await _api.post(
        ApiEndpoints.analyze,
        body: {
          'pair': pair,
          'timeframe': timeframe,
        },
      );

      if (response.success && response.data != null) {
        return MarketAnalysisResult(
          success: true,
          analysis: MarketAnalysis(
            pair: pair,
            timeframe: timeframe,
            result: response.data['result'] ?? '',
            marketInfo: response.data['marketInfo'] != null
                ? MarketInfo.fromJson(response.data['marketInfo'])
                : null,
          ),
          quotaStatus: response.data['quotaStatus'] != null
              ? QuotaStatus.fromJson(response.data['quotaStatus'])
              : null,
        );
      } else {
        return MarketAnalysisResult(
          success: false,
          error: response.message ?? 'Analysis failed',
          quotaStatus: response.data?['quotaStatus'] != null
              ? QuotaStatus.fromJson(response.data['quotaStatus'])
              : null,
        );
      }
    } catch (e) {
      return MarketAnalysisResult(
        success: false,
        error: 'Network error: $e',
      );
    }
  }

  /// Get economic news
  Future<String> getNews() async {
    try {
      final response = await _api.get(ApiEndpoints.news);
      
      if (response.success && response.data != null) {
        return response.data['html'] ?? 'No news available';
      }
    } catch (e) {
      // Silent fail
    }
    return 'No news available';
  }
}

class MarketAnalysisResult {
  final bool success;
  final MarketAnalysis? analysis;
  final String? error;
  final QuotaStatus? quotaStatus;

  MarketAnalysisResult({
    required this.success,
    this.analysis,
    this.error,
    this.quotaStatus,
  });
}
