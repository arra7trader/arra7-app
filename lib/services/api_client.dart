import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_endpoints.dart';

/// HTTP client for API calls
class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  String? _authToken;
  String? _sessionCookie;

  void setAuthToken(String token) {
    _authToken = token;
  }

  void setSessionCookie(String cookie) {
    _sessionCookie = cookie;
  }

  void clearAuth() {
    _authToken = null;
    _sessionCookie = null;
  }

  Map<String, String> get _headers {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (_authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    
    if (_sessionCookie != null) {
      headers['Cookie'] = _sessionCookie!;
    }
    
    return headers;
  }

  Future<ApiResponse> get(String endpoint, {Map<String, String>? queryParams}) async {
    try {
      var uri = Uri.parse('${ApiEndpoints.baseUrl}$endpoint');
      if (queryParams != null) {
        uri = uri.replace(queryParameters: queryParams);
      }
      
      final response = await http.get(uri, headers: _headers)
          .timeout(const Duration(seconds: 30));
      
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: $e',
      );
    }
  }

  Future<ApiResponse> post(String endpoint, {Map<String, dynamic>? body}) async {
    try {
      final uri = Uri.parse('${ApiEndpoints.baseUrl}$endpoint');
      
      final response = await http.post(
        uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      ).timeout(const Duration(seconds: 60));
      
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: $e',
      );
    }
  }

  ApiResponse _handleResponse(http.Response response) {
    try {
      final data = jsonDecode(response.body);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse(
          success: data['status'] == 'success' || response.statusCode == 200,
          data: data,
          message: data['message'],
        );
      } else {
        return ApiResponse(
          success: false,
          message: data['message'] ?? 'Request failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Failed to parse response',
        statusCode: response.statusCode,
      );
    }
  }
}

class ApiResponse {
  final bool success;
  final dynamic data;
  final String? message;
  final int? statusCode;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.statusCode,
  });

  T? getData<T>(String key) {
    if (data is Map && data.containsKey(key)) {
      return data[key] as T?;
    }
    return null;
  }
}
