import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../services/auth_service.dart';
import '../widgets/glass_card.dart';
import 'analisa_market_screen.dart';
import 'analisa_saham_screen.dart';
import 'depth_matrix_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = [
    const _DashboardTab(),
    const AnalisaMarketScreen(),
    const AnalisaSahamScreen(),
    const DepthMatrixScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDarkest,
      extendBody: true, // Allow body to go behind the bottom nav
      body: _screens[_currentIndex],
      bottomNavigationBar: _buildCustomNavBar(),
    );
  }

  Widget _buildCustomNavBar() {
    return Container(
      padding: const EdgeInsets.only(bottom: 20, left: 20, right: 20),
      child: GlassCard(
        opacity: 0.1,
        borderRadius: 30,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        tint: Colors.black,
        borderColor: Colors.white10,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(0, AppIcons.home, 'Home'),
            _buildNavItem(1, AppIcons.market, 'Market'),
            _buildNavItem(2, AppIcons.stock, 'Stocks'),
            _buildNavItem(3, AppIcons.depth, 'Depth'),
            _buildNavItem(4, AppIcons.profile, 'Profile'),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, String iconPath, String label) {
    final isSelected = _currentIndex == index;
    
    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: EdgeInsets.symmetric(horizontal: isSelected ? 16 : 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.neonBlue.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: isSelected ? Border.all(color: AppTheme.neonBlue.withOpacity(0.3)) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SvgPicture.string(
              iconPath,
              width: 20,
              height: 20,
              colorFilter: ColorFilter.mode(
                isSelected ? AppTheme.neonBlue : Colors.grey,
                BlendMode.srcIn,
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Dashboard/Home Tab
class _DashboardTab extends StatelessWidget {
  const _DashboardTab();

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();
    final user = authService.user;
    
    return Stack(
      children: [
        // Ambient Background
        Positioned(
          top: -100,
          right: -100,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.neonBlue.withOpacity(0.1),
              image: const DecorationImage(
                image: NetworkImage('https://arra7-app.vercel.app/grid-bg.png'), // Fallback if network works
                opacity: 0.2, 
              ),
            ),
          ),
        ),

        SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        gradient: AppTheme.cyberGradient,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.neonBlue.withOpacity(0.4),
                            blurRadius: 10,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          (user?.name?.isNotEmpty == true ? user!.name![0] : 'U').toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 24, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'WELCOME BACK',
                            style: TextStyle(
                              fontSize: 10,
                              letterSpacing: 2,
                              color: AppTheme.neonBlue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            user?.name ?? 'Commander',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Membership Badge
                    GlassCard(
                      borderRadius: 30,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      tint: AppTheme.neonPurple,
                      opacity: 0.1,
                      child: Row(
                        children: [
                          SvgPicture.string(AppIcons.crown, width: 14, colorFilter: const ColorFilter.mode(AppTheme.neonGold, BlendMode.srcIn)),
                          const SizedBox(width: 6),
                          Text(
                            user?.membershipDisplay ?? 'BASIC',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.neonGold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 32),
                
                // Ticker / Market Status
                GlassCard(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildTickerItem('BTC/USD', '93,240', '+1.2%', true),
                      Container(width: 1, height: 30, color: Colors.white10),
                      _buildTickerItem('XAU/USD', '2,654', '-0.5%', false),
                      Container(width: 1, height: 30, color: Colors.white10),
                      _buildTickerItem('EUR/USD', '1.082', '+0.1%', true),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                const Text(
                  'COMMAND CENTER',
                  style: TextStyle(
                    fontSize: 12,
                    letterSpacing: 1.5,
                    color: Colors.white54,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Grid Menu
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  childAspectRatio: 1.1,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  children: [
                    _FeatureCard(
                      title: 'MARKET AI',
                      subtitle: 'Forex & Crypto Analysis',
                      icon: AppIcons.market,
                      gradient: AppTheme.cyberGradient,
                      onTap: () => _updateIndex(context, 1),
                    ),
                    _FeatureCard(
                      title: 'STOCK AI',
                      subtitle: 'IDX Data Integration',
                      icon: AppIcons.stock,
                      gradient: AppTheme.greenGradient, // Need to add to theme or use local
                      onTap: () => _updateIndex(context, 2),
                    ),
                    _FeatureCard(
                      title: 'DEPTH MATRIX',
                      subtitle: 'Institutional Flow',
                      icon: AppIcons.depth,
                      gradient: AppTheme.goldGradient,
                      onTap: () => _updateIndex(context, 3),
                    ),
                    _FeatureCard(
                      title: 'PORTFOLIO',
                      subtitle: 'Performance',
                      icon: AppIcons.profile,
                      gradient: AppTheme.purpleGradient,
                      onTap: () => _updateIndex(context, 4),
                    ),
                  ],
                ),
                
                const SizedBox(height: 100), // Spacing for bottom nav
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _updateIndex(BuildContext context, int index) {
    final homeState = context.findAncestorStateOfType<_HomeScreenState>();
    homeState?.setState(() => homeState._currentIndex = index);
  }

  Widget _buildTickerItem(String pair, String price, String change, bool isUp) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(pair, style: const TextStyle(fontSize: 10, color: Colors.white54)),
        const SizedBox(height: 2),
        Text(price, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
        Text(
          change, 
          style: TextStyle(
            fontSize: 10, 
            color: isUp ? AppTheme.neonGreen : AppTheme.neonRed,
            fontWeight: FontWeight.bold
          )
        ),
      ],
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String icon;
  final Gradient gradient;
  final VoidCallback onTap;

  const _FeatureCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: (gradient.colors.first).withOpacity(0.4),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: SvgPicture.string(icon, width: 20, colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn)),
          ),
          const Spacer(),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 10, color: Colors.white54),
          ),
        ],
      ),
    );
  }
}
