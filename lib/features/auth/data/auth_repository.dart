import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../market/domain/market_models.dart';

class AuthSession {
  final String accessToken;
  final DateTime expiresAt;
  final AppUser user;

  const AuthSession({
    required this.accessToken,
    required this.expiresAt,
    required this.user,
  });
}

class AuthRepository {
  static const _secureStorage = FlutterSecureStorage();
  static const _tokenKey = 'arra_mobile_access_token';
  static const _expiryKey = 'arra_mobile_access_expiry';
  static const _userKey = 'arra_mobile_user';

  final ApiClient _apiClient;
  final GoogleSignIn _googleSignIn;

  AuthRepository({
    ApiClient? apiClient,
    GoogleSignIn? googleSignIn,
  })  : _apiClient = apiClient ?? ApiClient(),
        _googleSignIn = googleSignIn ??
            (Env.googleServerClientId.isNotEmpty
                ? GoogleSignIn(
                    scopes: const ['email'],
                    serverClientId: Env.googleServerClientId,
                  )
                : GoogleSignIn(
                    scopes: const ['email'],
                  ));

  Future<AuthSession?> loadCachedSession() async {
    final token = await _secureStorage.read(key: _tokenKey);
    final expiryRaw = await _secureStorage.read(key: _expiryKey);
    final prefs = await SharedPreferences.getInstance();
    final userRaw = prefs.getString(_userKey);

    if (token == null || expiryRaw == null || userRaw == null) return null;

    try {
      final expiry = DateTime.parse(expiryRaw);
      if (expiry.isBefore(DateTime.now().add(const Duration(minutes: 1)))) {
        await clearSession();
        return null;
      }
      final userJson = jsonDecode(userRaw) as Map<String, dynamic>;
      final user = AppUser.fromJson(userJson);
      return AuthSession(
        accessToken: token,
        expiresAt: expiry,
        user: user,
      );
    } catch (_) {
      await clearSession();
      return null;
    }
  }

  Future<AuthSession> signInWithGoogle() async {
    try {
      final account = await _googleSignIn.signIn();
      if (account == null) {
        throw const ApiException('Login dibatalkan.');
      }

      final authentication = await account.authentication;
      final idToken = authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw const ApiException('ID token Google tidak tersedia.');
      }

      final payload = await _apiClient.post(
        '/api/auth/mobile-google',
        body: {'idToken': idToken},
        retries: 1,
      );

      if (payload['success'] != true) {
        throw ApiException(
          (payload['message'] ?? payload['error'] ?? 'Login gagal').toString(),
        );
      }

      final accessToken = (payload['accessToken'] ?? payload['token'] ?? '').toString();
      if (accessToken.isEmpty) {
        throw const ApiException('Token aplikasi tidak valid.');
      }

      final userMap = payload['user'] is Map
          ? Map<String, dynamic>.from(payload['user'] as Map)
          : <String, dynamic>{};
      final expiresAtRaw = (payload['expiresAt'] ?? '').toString();
      final expiresAt = expiresAtRaw.isNotEmpty
          ? DateTime.tryParse(expiresAtRaw) ?? DateTime.now().add(const Duration(days: 7))
          : DateTime.now().add(const Duration(days: 7));

      final session = AuthSession(
        accessToken: accessToken,
        expiresAt: expiresAt,
        user: AppUser.fromJson(userMap),
      );

      await _saveSession(session);
      return session;
    } on ApiException {
      rethrow;
    } on PlatformException catch (error) {
      throw _mapGoogleSignInError(error);
    } catch (_) {
      throw const ApiException('Login Google gagal. Coba lagi beberapa saat.');
    }
  }

  ApiException _mapGoogleSignInError(PlatformException error) {
    final combined = '${error.code} ${error.message ?? ''} ${error.details ?? ''}'.toLowerCase();

    if (combined.contains('apiexception: 10') ||
        combined.contains('developer_error') ||
        combined.contains('sign_in_failed')) {
      return const ApiException(
        'Google Sign-In belum cocok dengan konfigurasi Android. '
        'Pastikan package com.arra7.mobile, SHA-1 Android, dan Web Client ID Google sudah sesuai.',
      );
    }

    if (combined.contains('network_error') || combined.contains('apiexception: 7')) {
      return const ApiException('Koneksi ke layanan Google bermasalah. Cek internet lalu coba lagi.');
    }

    if (combined.contains('sign_in_canceled') || combined.contains('canceled')) {
      return const ApiException('Login dibatalkan.');
    }

    return const ApiException('Gagal login Google. Silakan coba lagi.');
  }

  Future<void> _saveSession(AuthSession session) async {
    await _secureStorage.write(key: _tokenKey, value: session.accessToken);
    await _secureStorage.write(key: _expiryKey, value: session.expiresAt.toIso8601String());

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(session.user.toJson()));
  }

  Future<void> clearSession() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _expiryKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
  }

  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {
      // Ignore local signout failure, still clear app session.
    }
    await clearSession();
  }
}
