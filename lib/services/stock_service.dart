import '../models/stock_data.dart';
import '../models/user_model.dart';
import 'api_client.dart';
import '../constants/api_endpoints.dart';

/// Service for stock analysis API calls
class StockService {
  final ApiClient _api = ApiClient();

  /// Get stock data by symbol
  Future<StockDataResult> getStockData(String symbol) async {
    try {
      final response = await _api.get(
        ApiEndpoints.stockData,
        queryParams: {'symbol': symbol},
      );

      if (response.success && response.data != null) {
        final stockData = response.data['data'];
        if (stockData != null) {
          return StockDataResult(
            success: true,
            data: StockData.fromJson(stockData),
          );
        }
      }
      
      return StockDataResult(
        success: false,
        error: response.message ?? 'Stock not found',
      );
    } catch (e) {
      return StockDataResult(
        success: false,
        error: 'Network error: $e',
      );
    }
  }

  /// Analyze stock with AI
  Future<StockAnalysisResult> analyzeStock({
    required String symbol,
    required StockData stockData,
  }) async {
    try {
      final response = await _api.post(
        ApiEndpoints.stockAnalyze,
        body: {
          'symbol': symbol,
          'stockData': {
            'symbol': stockData.symbol,
            'name': stockData.name,
            'currentPrice': stockData.currentPrice,
            'previousClose': stockData.previousClose,
            'change': stockData.change,
            'changePercent': stockData.changePercent,
            'high52Week': stockData.high52Week,
            'low52Week': stockData.low52Week,
            'volume': stockData.volume,
            'avgVolume': stockData.avgVolume,
            'marketCap': stockData.marketCap,
          },
        },
      );

      if (response.success && response.data != null) {
        return StockAnalysisResult(
          success: true,
          analysis: response.data['analysis'] ?? '',
        );
      } else {
        return StockAnalysisResult(
          success: false,
          error: response.message ?? 'Analysis failed',
        );
      }
    } catch (e) {
      return StockAnalysisResult(
        success: false,
        error: 'Network error: $e',
      );
    }
  }

  /// Get stock quota status
  Future<QuotaStatus?> getQuota() async {
    try {
      final response = await _api.get(ApiEndpoints.stockQuota);
      
      if (response.success && response.data != null) {
        final quotaData = response.data['data'] ?? response.data;
        return QuotaStatus.fromJson(quotaData);
      }
    } catch (e) {
      // Silent fail
    }
    
    // Default quota
    return QuotaStatus(
      membership: 'BASIC',
      dailyLimit: 3,
      used: 0,
      remaining: 3,
      canAnalyze: true,
    );
  }
}

class StockDataResult {
  final bool success;
  final StockData? data;
  final String? error;

  StockDataResult({
    required this.success,
    this.data,
    this.error,
  });
}

class StockAnalysisResult {
  final bool success;
  final String? analysis;
  final String? error;

  StockAnalysisResult({
    required this.success,
    this.analysis,
    this.error,
  });
}
