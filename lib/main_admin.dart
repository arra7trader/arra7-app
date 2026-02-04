import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/app_theme.dart';
import 'screens/admin/admin_login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set system UI style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppTheme.bgDarkest,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  
  // Lock orientation
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  
  runApp(const ARRA7AdminApp());
}

class ARRA7AdminApp extends StatelessWidget {
  const ARRA7AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ARRA7 Admin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.premiumTheme,
      home: const AdminLoginScreen(), // Start with Admin Login
    );
  }
}
