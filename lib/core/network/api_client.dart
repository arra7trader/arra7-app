import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/env.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiClient {
  final http.Client _httpClient;

  ApiClient({http.Client? httpClient}) : _httpClient = httpClient ?? http.Client();

  Future<Map<String, dynamic>> get(
    String path, {
    String? bearerToken,
    Map<String, String>? query,
    int retries = 2,
  }) async {
    final uri = _buildUri(path, query);
    return _sendWithRetry(
      () => _httpClient.get(uri, headers: _headers(bearerToken)),
      retries: retries,
    );
  }

  Future<Map<String, dynamic>> post(
    String path, {
    String? bearerToken,
    Map<String, dynamic>? body,
    int retries = 2,
  }) async {
    final uri = _buildUri(path, null);
    return _sendWithRetry(
      () => _httpClient.post(
        uri,
        headers: _headers(bearerToken),
        body: jsonEncode(body ?? <String, dynamic>{}),
      ),
      retries: retries,
    );
  }

  Uri _buildUri(String path, Map<String, String>? query) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('${Env.apiBaseUrl}$normalizedPath');
    if (query == null || query.isEmpty) return uri;
    return uri.replace(queryParameters: query);
  }

  Map<String, String> _headers(String? bearerToken) {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }
    return headers;
  }

  Future<Map<String, dynamic>> _sendWithRetry(
    Future<http.Response> Function() request, {
    required int retries,
  }) async {
    Object? lastError;
    for (int attempt = 0; attempt <= retries; attempt++) {
      try {
        final response = await request().timeout(const Duration(seconds: 25));
        if (response.statusCode >= 500 && attempt < retries) {
          await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
          continue;
        }
        return _decodeResponse(response);
      } on TimeoutException catch (error) {
        lastError = error;
        if (attempt >= retries) break;
        await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
      } on SocketException catch (error) {
        lastError = error;
        if (attempt >= retries) break;
        await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
      } catch (error) {
        lastError = error;
        break;
      }
    }

    if (lastError is ApiException) throw lastError;
    throw ApiException('Koneksi bermasalah. Coba lagi.');
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    dynamic payload;
    try {
      payload = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
    } catch (_) {
      payload = <String, dynamic>{'message': response.body};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (payload is Map<String, dynamic>) return payload;
      return <String, dynamic>{'data': payload};
    }

    final message = _extractMessage(payload) ?? 'Request gagal (${response.statusCode})';
    throw ApiException(message, statusCode: response.statusCode);
  }

  String? _extractMessage(dynamic payload) {
    if (payload is Map<String, dynamic>) {
      final message = payload['message'] ?? payload['error'];
      if (message is String && message.isNotEmpty) return message;
    }
    return null;
  }
}
