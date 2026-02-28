import 'package:flutter/foundation.dart';
import '../../market/data/market_repository.dart';
import '../../market/domain/market_models.dart';
import '../data/auth_repository.dart';

enum AuthState {
  initializing,
  unauthenticated,
  authenticating,
  authenticated,
  error,
}

class AuthController extends ChangeNotifier {
  final AuthRepository _authRepository;
  final MarketRepository _marketRepository;

  AuthState _state = AuthState.initializing;
  AuthSession? _session;
  BootstrapData? _bootstrap;
  String? _errorMessage;

  AuthController({
    AuthRepository? authRepository,
    MarketRepository? marketRepository,
  })  : _authRepository = authRepository ?? AuthRepository(),
        _marketRepository = marketRepository ?? MarketRepository();

  AuthState get state => _state;
  String? get errorMessage => _errorMessage;
  String? get accessToken => _session?.accessToken;
  AppUser? get user => _bootstrap?.user ?? _session?.user;
  QuotaInfo? get quota => _bootstrap?.quota;
  MarketConfig? get marketConfig => _bootstrap?.marketConfig;
  bool get isAuthenticated => _state == AuthState.authenticated;

  Future<void> initialize() async {
    _state = AuthState.initializing;
    _errorMessage = null;
    notifyListeners();

    try {
      final cached = await _authRepository.loadCachedSession();
      if (cached == null) {
        _state = AuthState.unauthenticated;
        notifyListeners();
        return;
      }

      _session = cached;
      _state = AuthState.authenticated;
      notifyListeners();

      await refreshBootstrap(silent: true);
    } catch (error) {
      _errorMessage = 'Gagal memuat sesi.';
      _state = AuthState.error;
      notifyListeners();
    }
  }

  Future<bool> signInWithGoogle() async {
    _state = AuthState.authenticating;
    _errorMessage = null;
    notifyListeners();

    try {
      final session = await _authRepository.signInWithGoogle();
      _session = session;
      _state = AuthState.authenticated;
      notifyListeners();

      await refreshBootstrap(silent: true);
      return true;
    } catch (error) {
      _errorMessage = error.toString();
      _state = AuthState.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> refreshBootstrap({bool silent = false}) async {
    final token = _session?.accessToken;
    if (token == null || token.isEmpty) return;

    if (!silent) {
      _errorMessage = null;
      notifyListeners();
    }

    try {
      _bootstrap = await _marketRepository.fetchBootstrap(token: token);
      _state = AuthState.authenticated;
      notifyListeners();
    } catch (error) {
      final lower = error.toString().toLowerCase();
      if (lower.contains('401') || lower.contains('unauthorized')) {
        await signOut();
        return;
      }

      if (!silent) {
        _errorMessage = 'Gagal sinkron data akun.';
        _state = AuthState.error;
        notifyListeners();
      }
    }
  }

  Future<void> signOut() async {
    await _authRepository.signOut();
    _session = null;
    _bootstrap = null;
    _errorMessage = null;
    _state = AuthState.unauthenticated;
    notifyListeners();
  }
}
