import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../services/auth_service.dart';
import '../widgets/glass_card.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();
    final user = authService.user;

    return SafeArea(
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                GlassCard(
                  borderRadius: 12,
                  padding: const EdgeInsets.all(10),
                  child: SvgPicture.string(AppIcons.profile, width: 24, colorFilter: const ColorFilter.mode(AppTheme.neonPurple, BlendMode.srcIn)),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'USER PROFILE',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Text(
                      'Account Settings',
                      style: TextStyle(color: Colors.white54, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  Center(
                    child: Stack(
                      children: [
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AppTheme.purpleGradient,
                            boxShadow: [
                              BoxShadow(color: AppTheme.neonPurple.withOpacity(0.4), blurRadius: 20),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              (user?.name?.isNotEmpty == true ? user!.name![0] : 'U').toUpperCase(),
                              style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: AppTheme.bgDark,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.edit, size: 16, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  Text(
                    user?.name ?? 'Guest User',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Text(
                    user?.email ?? 'No Email',
                    style: const TextStyle(fontSize: 14, color: Colors.white54),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Membership Card
                  GlassCard(
                    opacity: 0.1,
                    tint: AppTheme.neonGold,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.neonGold.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: SvgPicture.string(
                            AppIcons.crown, 
                            width: 24, 
                            colorFilter: const ColorFilter.mode(AppTheme.neonGold, BlendMode.srcIn)
                          ),
                        ),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CURRENT PLAN',
                              style: TextStyle(fontSize: 10, color: AppTheme.neonGold, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              user?.membershipDisplay ?? 'BASIC',
                              style: const TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.neonGold),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'UPGRADE',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  _buildMenuItem(Icons.history, 'Analysis History', 'View past signals'),
                  _buildMenuItem(Icons.notifications_outlined, 'Notifications', 'Alert preferences'),
                  _buildMenuItem(Icons.security, 'Security', '2FA & Password'),
                  _buildMenuItem(Icons.help_outline, 'Support', 'Contact us'),
                  
                  const SizedBox(height: 32),
                  
                  InkWell(
                    onTap: () async {
                      await authService.logout();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      }
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppTheme.neonRed.withOpacity(0.5)),
                        borderRadius: BorderRadius.circular(12),
                        color: AppTheme.neonRed.withOpacity(0.1),
                      ),
                      child: const Center(
                        child: Text(
                          'LOG OUT',
                          style: TextStyle(color: AppTheme.neonRed, fontWeight: FontWeight.bold, letterSpacing: 1),
                        ),
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        borderRadius: 16,
        child: Row(
          children: [
            Icon(icon, color: Colors.white70),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  Text(subtitle, style: const TextStyle(color: Colors.white30, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white30, size: 14),
          ],
        ),
      ),
    );
  }
}
