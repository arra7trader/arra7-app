import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/user_model.dart';
import 'api_client.dart';
import '../constants/api_endpoints.dart';

/// Authentication service for login/logout
class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final ApiClient _api = ApiClient();
  UserModel? _user;
  bool _isLoading = false;
  String? _error;

  UserModel? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Initialize auth state from storage
  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('user');
      final token = prefs.getString('auth_token');

      if (userJson != null && token != null) {
        _user = UserModel.fromJson(
          Map<String, dynamic>.from(
            Uri.splitQueryString(userJson).map(
              (key, value) => MapEntry(key, value),
            ),
          ),
        );
        _api.setAuthToken(token);
        
        // Verify session is still valid
        await refreshSession();
      }
    } catch (e) {
      debugPrint('Auth init error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Launch Google OAuth in browser
  Future<void> loginWithGoogle() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Open OAuth URL in browser
      final oauthUrl = Uri.parse(
        '${ApiEndpoints.baseUrl}/api/auth/signin/google?callbackUrl=${ApiEndpoints.baseUrl}',
      );
      
      if (await canLaunchUrl(oauthUrl)) {
        await launchUrl(
          oauthUrl,
          mode: LaunchMode.externalApplication,
        );
      }
    } catch (e) {
      _error = 'Failed to open login: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Set user after OAuth callback
  Future<void> setUserFromCallback(Map<String, dynamic> userData, String token) async {
    _user = UserModel.fromJson(userData);
    _api.setAuthToken(token);

    // Save to storage
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    await prefs.setString('user_id', _user!.id);
    await prefs.setString('user_name', _user!.name ?? '');
    await prefs.setString('user_email', _user!.email ?? '');
    await prefs.setString('user_image', _user!.image ?? '');
    await prefs.setString('user_membership', _user!.membership);

    notifyListeners();
  }

  /// Simulated login for demo (when OAuth is not available)
  Future<bool> loginDemo(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Create demo user
      _user = UserModel(
        id: 'demo-${DateTime.now().millisecondsSinceEpoch}',
        name: email.split('@').first,
        email: email,
        membership: 'BASIC',
      );

      // Save to storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_id', _user!.id);
      await prefs.setString('user_name', _user!.name ?? '');
      await prefs.setString('user_email', _user!.email ?? '');
      await prefs.setString('user_membership', _user!.membership);
      await prefs.setBool('is_demo', true);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Login failed: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Check if stored demo session exists
  Future<bool> checkDemoSession() async {
    final prefs = await SharedPreferences.getInstance();
    final isDemo = prefs.getBool('is_demo') ?? false;
    
    if (isDemo) {
      final userId = prefs.getString('user_id');
      final userName = prefs.getString('user_name');
      final userEmail = prefs.getString('user_email');
      final membership = prefs.getString('user_membership');
      
      if (userId != null) {
        _user = UserModel(
          id: userId,
          name: userName,
          email: userEmail,
          membership: membership ?? 'BASIC',
        );
        notifyListeners();
        return true;
      }
    }
    return false;
  }

  /// Refresh session from API
  Future<void> refreshSession() async {
    try {
      final response = await _api.get(ApiEndpoints.session);
      
      if (response.success && response.data != null) {
        final userData = response.data['user'];
        if (userData != null) {
          _user = UserModel.fromJson(userData);
        }
      }
    } catch (e) {
      debugPrint('Session refresh error: $e');
    }
    notifyListeners();
  }

  /// Logout user
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Clear API auth
      _api.clearAuth();

      // Clear storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_token');
      await prefs.remove('user_id');
      await prefs.remove('user_name');
      await prefs.remove('user_email');
      await prefs.remove('user_image');
      await prefs.remove('user_membership');
      await prefs.remove('is_demo');

      _user = null;
    } catch (e) {
      debugPrint('Logout error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }
}
