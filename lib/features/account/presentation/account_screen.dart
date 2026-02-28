import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/brand_logo.dart';
import '../../../core/widgets/error_state.dart';
import '../../../core/widgets/loading_state.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../market/domain/market_models.dart';
import '../data/account_repository.dart';
import 'widgets/quota_card.dart';

class AccountScreen extends StatefulWidget {
  final bool isActive;

  const AccountScreen({
    super.key,
    required this.isActive,
  });

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final AccountRepository _repository = AccountRepository();

  bool _loading = true;
  String? _errorMessage;
  AccountState? _accountState;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAccount());
  }

  @override
  void didUpdateWidget(covariant AccountScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.isActive && widget.isActive) {
      _loadAccount();
    }
  }

  Future<void> _loadAccount() async {
    final auth = context.read<AuthController>();
    final token = auth.accessToken;
    final cachedUser = auth.user;
    final cachedQuota = auth.quota;

    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _errorMessage = 'Sesi tidak ditemukan.';
      });
      return;
    }

    if (cachedUser != null && cachedQuota != null && _accountState == null) {
      setState(() {
        _accountState = AccountState(user: cachedUser, quota: cachedQuota);
      });
    }

    setState(() {
      _loading = _accountState == null;
      _errorMessage = null;
    });

    try {
      final account = await _repository.fetchAccount(token: token);
      if (!mounted) return;
      setState(() {
        _accountState = account;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      final message = error.toString().toLowerCase();
      if (message.contains('unauthorized') || message.contains('401')) {
        await context.read<AuthController>().signOut();
        return;
      }
      setState(() {
        _loading = false;
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  EdgeInsets _resolvePadding(double width) {
    if (width < DesignTokens.compactBreakpoint) return DesignTokens.pagePaddingCompact;
    if (width < DesignTokens.mediumBreakpoint) return DesignTokens.pagePaddingMedium;
    return DesignTokens.pagePaddingLarge;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: LoadingState(message: 'Memuat akun...'),
        ),
      );
    }

    if (_errorMessage != null && _accountState == null) {
      return Scaffold(
        body: ErrorState(
          message: _errorMessage!,
          onRetry: _loadAccount,
        ),
      );
    }

    final account = _accountState;
    if (account == null) {
      return const Scaffold(
        body: ErrorState(message: 'Data akun tidak tersedia.'),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final padding = _resolvePadding(constraints.maxWidth);
        final contentMaxWidth = constraints.maxWidth > 900 ? 760.0 : double.infinity;

        return Scaffold(
          appBar: AppBar(
            leading: const BrandAppBarLogo(),
            title: const Text('Info Akun'),
            actions: [
              IconButton(
                tooltip: 'Refresh',
                onPressed: _loadAccount,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          body: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth),
              child: ListView(
                padding: padding,
                children: [
                  _ProfileCard(user: account.user),
                  const SizedBox(height: 14),
                  QuotaCard(quota: account.quota),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _errorMessage!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton.tonalIcon(
                    onPressed: () => context.read<AuthController>().refreshBootstrap(),
                    icon: const Icon(Icons.sync_rounded),
                    label: const Text('Sinkron Data'),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: () => context.read<AuthController>().signOut(),
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Keluar'),
                  ),
                  const SizedBox(height: 28),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final AppUser user;

  const _ProfileCard({required this.user});

  @override
  Widget build(BuildContext context) {
    final fallbackEmail = user.email.isNotEmpty ? user.email : 'user@arra7.app';
    final initials = (user.name?.trim().isNotEmpty == true
            ? user.name!.trim().substring(0, 1)
            : fallbackEmail.substring(0, 1))
        .toUpperCase();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              child: Text(initials, style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.name ?? user.email,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 2),
                  Text(user.email),
                ],
              ),
            ),
            Chip(label: Text(user.tier)),
          ],
        ),
      ),
    );
  }
}
