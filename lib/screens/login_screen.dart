import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart'; // Added dependency import
import 'dart:ui';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../widgets/glass_card.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final AuthService _authService = AuthService();
  final TextEditingController _emailController = TextEditingController();
  
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animController, curve: const Interval(0.0, 0.6, curve: Curves.easeOut)),
    );
    
    _slideAnimation = Tween<Offset>(begin: const Offset(0, 0.2), end: Offset.zero).animate(
      CurvedAnimation(parent: _animController, curve: const Interval(0.2, 0.8, curve: Curves.easeOutCubic)),
    );
    
    _animController.forward();
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    final hasSession = await _authService.checkDemoSession();
    if (hasSession && mounted) {
      _navigateToHome();
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _navigateToHome() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => const HomeScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
        transitionDuration: const Duration(milliseconds: 800),
      ),
    );
  }

  Future<void> _loginWithGoogle() async {
    setState(() { _isLoading = true; _error = null; });
    await _authService.loginWithGoogle();
    setState(() { _isLoading = false; });
  }

  Future<void> _loginDemo() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Please enter your email');
      return;
    }

    setState(() { _isLoading = true; _error = null; });
    final success = await _authService.loginDemo(email);
    setState(() { _isLoading = false; });

    if (success && mounted) {
      _navigateToHome();
    } else {
      setState(() => _error = 'Login failed. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDarkest,
      body: Stack(
        children: [
          // Background Elements - Using BoxShadow instead of filter for neon glow
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.transparent,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.neonBlue.withOpacity(0.2),
                    blurRadius: 100,
                    spreadRadius: 20,
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.transparent,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.neonPurple.withOpacity(0.2),
                    blurRadius: 100,
                    spreadRadius: 20,
                  ),
                ],
              ),
            ),
          ),
          
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Animated Logo
                        TweenAnimationBuilder(
                          tween: Tween<double>(begin: 0, end: 1),
                          duration: const Duration(seconds: 2),
                          builder: (context, value, child) {
                            return Transform.scale(
                              scale: 0.8 + (0.2 * value),
                              child: Container(
                                width: 120,
                                height: 120,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppTheme.neonBlue.withOpacity(0.4 * value),
                                      blurRadius: 40,
                                      spreadRadius: 5,
                                    ),
                                  ],
                                ),
                                child: SvgPicture.string(
                                  AppIcons.logo,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            );
                          },
                        ),
                        
                        const SizedBox(height: 32),
                        
                        // Title
                        Text(
                          'ARRA7',
                          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            letterSpacing: 4,
                            shadows: [
                              Shadow(
                                color: AppTheme.neonBlue.withOpacity(0.5),
                                blurRadius: 20,
                              ),
                            ],
                          ),
                        ),
                        
                        Text(
                          'QUANTUM INTELLIGENCE',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            letterSpacing: 3,
                            color: AppTheme.neonBlue,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        
                        const SizedBox(height: 60),
                        
                        // Login Card
                        GlassCard(
                          opacity: 0.08,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'ACCESS TERMINAL',
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              
                              const SizedBox(height: 24),
                              
                              // Google Button
                              _buildGoogleButton(),
                              
                              const SizedBox(height: 24),
                              
                              const Row(
                                children: [
                                  Expanded(child: Divider(color: Colors.white24)),
                                  Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 16),
                                    child: Text('OR', style: TextStyle(color: Colors.white24, fontSize: 10)),
                                  ),
                                  Expanded(child: Divider(color: Colors.white24)),
                                ],
                              ),
                              
                              const SizedBox(height: 24),
                              
                              // Email Input
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.black26,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.white10),
                                ),
                                child: TextField(
                                  controller: _emailController,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: const InputDecoration(
                                    hintText: 'Identity / Email',
                                    hintStyle: TextStyle(color: Colors.white30),
                                    border: InputBorder.none,
                                    prefixIcon: Icon(Icons.person_outline, color: AppTheme.neonBlue),
                                    contentPadding: EdgeInsets.all(16),
                                  ),
                                ),
                              ),
                              
                              const SizedBox(height: 16),
                              
                              // Demo Button
                              _buildDemoButton(),
                            ],
                          ),
                        ),
                        
                        if (_error != null) ...[
                          const SizedBox(height: 24),
                          Text(
                            _error!,
                            style: const TextStyle(color: AppTheme.neonRed, fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoogleButton() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: _isLoading ? null : _loginWithGoogle,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Fallback Google Icon
              const Icon(Icons.g_mobiledata, color: Colors.black, size: 28),
              const SizedBox(width: 8),
              Text(
                'Continue with Google',
                style: GoogleFonts.inter(
                  color: Colors.black,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDemoButton() {
    return Container(
      decoration: BoxDecoration(
        gradient: AppTheme.cyberGradient,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppTheme.neonBlue.withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _isLoading ? null : _loginDemo,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: _isLoading
              ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('INITIALIZE DEMO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1)),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward, color: Colors.white, size: 18),
                  ],
                ),
          ),
        ),
      ),
    );
  }
}
