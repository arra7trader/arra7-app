import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_icons.dart';
import '../../widgets/glass_card.dart';
import 'admin_dashboard.dart';

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final TextEditingController _passkeyController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  void _login() {
    setState(() => _isLoading = true);
    
    // Simulations for Admin Login (Mock)
    Future.delayed(const Duration(seconds: 1), () {
      if (_passkeyController.text == 'admin123' || _passkeyController.text.isNotEmpty) {
        if (mounted) {
          Navigator.pushReplacement(
            context, 
            MaterialPageRoute(builder: (_) => const AdminDashboard())
          );
        }
      } else {
         setState(() {
           _isLoading = false;
           _error = 'Invalid Access Code';
         });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Darker for admin
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100, 
                height: 100, 
                decoration: const BoxDecoration(shape: BoxShape.circle, gradient: AppTheme.cyberGradient),
                child: const Icon(Icons.security, size: 50, color: Colors.white),
              ),
              const SizedBox(height: 32),
              Text(
                'SYSTEM ADMIN',
                style: Theme.of(context).textTheme.displayMedium,
              ),
              const Text(
                'RESTRICTED ACCESS',
                style: TextStyle(color: AppTheme.neonRed, letterSpacing: 2, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 48),
              
              GlassCard(
                opacity: 0.1,
                child: Column(
                  children: [
                    TextField(
                      controller: _passkeyController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        hintText: 'Enter Admin Passkey',
                        hintStyle: TextStyle(color: Colors.white30),
                        prefixIcon: Icon(Icons.lock_outline, color: Colors.white70),
                        border: InputBorder.none,
                      ),
                    ),
                    const SizedBox(height: 24),
                    InkWell(
                      onTap: _isLoading ? null : _login,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: AppTheme.neonRed,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                             BoxShadow(color: AppTheme.neonRed.withOpacity(0.4), blurRadius: 20)
                          ]
                        ),
                        child: Center(
                          child: _isLoading 
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white))
                            : const Text('AUTHENTICATE', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 24),
                  child: Text(_error!, style: const TextStyle(color: AppTheme.neonRed)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
