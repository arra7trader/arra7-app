import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/brand_logo.dart';
import '../../../core/widgets/loading_state.dart';
import 'auth_controller.dart';

class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final maxWidth = constraints.maxWidth > DesignTokens.mediumBreakpoint
              ? 560.0
              : double.infinity;

          return DecoratedBox(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color(0xFF07142A),
                  Color(0xFF132A56),
                  Color(0xFF195C8A),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: maxWidth),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.24),
                      borderRadius: BorderRadius.circular(DesignTokens.radiusLg),
                      border: Border.all(color: Colors.white.withOpacity(0.12)),
                    ),
                    child: const _SignInContent(),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SignInContent extends StatelessWidget {
  const _SignInContent();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final isLoading = auth.state == AuthState.authenticating;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Center(
          child: BrandLogo(
            size: 86,
          ),
        ),
        const SizedBox(height: 14),
        const SizedBox(height: 8),
        Text(
          'ARRA7',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.displaySmall?.copyWith(
                color: Colors.white,
                letterSpacing: 1.2,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'AI Market Intelligence',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.white70,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.08),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            'Masuk menggunakan akun Google Anda untuk mengakses Analisa Market dan Info Akun.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withOpacity(0.9),
                ),
          ),
        ),
        const SizedBox(height: 24),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            backgroundColor: Colors.white,
            foregroundColor: Colors.black,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          onPressed: isLoading
              ? null
              : () async {
                  final success = await context.read<AuthController>().signInWithGoogle();
                  if (!context.mounted || success) return;
                },
          icon: const Icon(Icons.g_mobiledata_rounded, size: 28),
          label: const Text(
            'Lanjut dengan Google',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
        ),
        if (isLoading) ...[
          const SizedBox(height: 16),
          const LoadingState(message: 'Memproses login...'),
        ],
        if (!isLoading && auth.errorMessage != null) ...[
          const SizedBox(height: 16),
          Text(
            auth.errorMessage!,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.red.shade200,
                ),
          ),
        ],
      ],
    );
  }
}
