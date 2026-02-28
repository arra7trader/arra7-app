import '../../../core/network/api_client.dart';
import '../../market/domain/market_models.dart';

class AccountState {
  final AppUser user;
  final QuotaInfo quota;

  const AccountState({
    required this.user,
    required this.quota,
  });
}

class AccountRepository {
  final ApiClient _apiClient;

  AccountRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<AccountState> fetchAccount({required String token}) async {
    final mePayload = await _apiClient.get('/api/user/me', bearerToken: token, retries: 1);
    final quotaPayload =
        await _apiClient.get('/api/user/quota', bearerToken: token, retries: 1);

    final rawUser = mePayload['user'] is Map
        ? Map<String, dynamic>.from(mePayload['user'] as Map)
        : <String, dynamic>{};
    final rawMembership = mePayload['membership'] is Map
        ? Map<String, dynamic>.from(mePayload['membership'] as Map)
        : <String, dynamic>{};

    if (!rawUser.containsKey('tier') && rawMembership.isNotEmpty) {
      rawUser['tier'] = rawMembership['membership'] ?? 'BASIC';
    }

    final rawQuota = quotaPayload['quota'] is Map
        ? Map<String, dynamic>.from(quotaPayload['quota'] as Map)
        : <String, dynamic>{};

    return AccountState(
      user: AppUser.fromJson(rawUser),
      quota: QuotaInfo.fromJson(rawQuota),
    );
  }
}
