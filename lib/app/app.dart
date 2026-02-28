import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../core/widgets/loading_state.dart';
import '../features/auth/presentation/auth_controller.dart';
import '../features/auth/presentation/sign_in_screen.dart';
import 'router.dart';
import 'shell.dart';

class ArraMobileApp extends StatelessWidget {
  const ArraMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthController()..initialize(),
      child: MaterialApp(
        title: 'ARRA7',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        onGenerateRoute: AppRouter.onGenerateRoute,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('id'),
          Locale('en'),
        ],
        locale: const Locale('id'),
        home: const _AppGate(),
      ),
    );
  }
}

class _AppGate extends StatelessWidget {
  const _AppGate();

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthController>(
      builder: (context, auth, _) {
        switch (auth.state) {
          case AuthState.initializing:
            return const Scaffold(
              body: Center(
                child: LoadingState(message: 'Menyiapkan aplikasi...'),
              ),
            );
          case AuthState.authenticated:
            return const AppShell();
          case AuthState.authenticating:
          case AuthState.unauthenticated:
          case AuthState.error:
            return const SignInScreen();
        }
      },
    );
  }
}
