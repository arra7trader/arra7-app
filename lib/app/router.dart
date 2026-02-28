import 'package:flutter/material.dart';
import '../features/auth/presentation/sign_in_screen.dart';
import 'shell.dart';

class AppRouter {
  static const String signIn = '/sign-in';
  static const String shell = '/shell';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case signIn:
        return MaterialPageRoute<void>(
          builder: (_) => const SignInScreen(),
          settings: settings,
        );
      case shell:
        return MaterialPageRoute<void>(
          builder: (_) => const AppShell(),
          settings: settings,
        );
      default:
        return MaterialPageRoute<void>(
          builder: (_) => const AppShell(),
          settings: settings,
        );
    }
  }
}
