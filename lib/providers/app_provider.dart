import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppProvider extends ChangeNotifier {
  bool _isLoading = true;
  bool _isLoggedIn = false;
  String? _authToken;
  String _currentUrl = 'https://arra7-app.vercel.app/';
  
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;
  String? get authToken => _authToken;
  String get currentUrl => _currentUrl;
  
  AppProvider() {
    _loadUserData();
  }
  
  Future<void> _loadUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _authToken = prefs.getString('auth_token');
      _isLoggedIn = _authToken != null && _authToken!.isNotEmpty;
    } catch (e) {
      debugPrint('Error loading user data: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> setAuthToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    _authToken = token;
    _isLoggedIn = true;
    notifyListeners();
  }
  
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    _authToken = null;
    _isLoggedIn = false;
    notifyListeners();
  }
  
  void setCurrentUrl(String url) {
    _currentUrl = url;
    notifyListeners();
  }
  
  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
}
