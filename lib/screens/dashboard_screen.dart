import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../widgets/glass_card.dart';
import 'analisa_market_screen.dart';
import 'analisa_saham_screen.dart';
import 'fibonacci_kanji_screen.dart';
import 'depth_matrix_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = [
    const _HomeContent(),
    const AnalisaMarketScreen(),
    const AnalisaSahamScreen(),
    const DepthMatrixScreen(),
    const FibonacciKanjiScreen(),
  ];

  void _onNavTap(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: SafeArea(
        child: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.8),
          border: const Border(top: BorderSide(color: Colors.white10)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(0, AppIcons.home, 'Home'),
            _buildNavItem(1, AppIcons.market, 'Forex'),
            _buildNavItem(2, AppIcons.stock, 'Stocks'),
            _buildNavItem(3, AppIcons.depth, 'Depth'),
            _buildNavItem(4, AppIcons.calculate, 'Kanji'), // Fibonacci
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, String icon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => _onNavTap(index),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SvgPicture.string(
            icon,
            width: 24,
            colorFilter: ColorFilter.mode(
              isSelected ? AppTheme.neonBlue : Colors.white54,
              BlendMode.srcIn,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isSelected ? AppTheme.neonBlue : Colors.white54,
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Welcome back,',
                    style: TextStyle(color: Colors.white54, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'TRADER',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.neonBlue),
                ),
                child: const CircleAvatar(
                  backgroundColor: Colors.white10,
                  child: Icon(Icons.person, color: Colors.white),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 32),
          
          // AI Status
          GlassCard(
            borderRadius: 16,
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.neonBlue.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: SvgPicture.string(AppIcons.aiRobot, width: 24, colorFilter: const ColorFilter.mode(AppTheme.neonBlue, BlendMode.srcIn)),
                ),
                const SizedBox(width: 16),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI SYSTEM ONLINE',
                      style: TextStyle(color: AppTheme.neonBlue, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'All models are running optimally',
                      style: TextStyle(color: Colors.white54, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Features Grid
          const Text(
            'QUICK ACCESS',
            style: TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(height: 16),
          
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 1.1,
            children: [
              _FeatureCard(
                 title: 'FOREX AI',
                 subtitle: 'Signal Generator',
                 icon: AppIcons.market,
                 color: AppTheme.neonBlue,
                 onTap: () => (context.findAncestorStateOfType<_DashboardScreenState>())?._onNavTap(1),
              ),
              _FeatureCard(
                 title: 'IDX STOCK',
                 subtitle: 'Smart Analytics',
                 icon: AppIcons.stock,
                 color: AppTheme.neonGreen,
                 onTap: () => (context.findAncestorStateOfType<_DashboardScreenState>())?._onNavTap(2),
              ),
              _FeatureCard(
                 title: 'DEPTH MATRIX',
                 subtitle: 'Volume Heatmap',
                 icon: AppIcons.depth,
                 color: AppTheme.neonGold,
                 onTap: () => (context.findAncestorStateOfType<_DashboardScreenState>())?._onNavTap(3),
              ),
              _FeatureCard(
                 title: 'FIBO KANJI',
                 subtitle: 'Golden Ratio',
                 icon: AppIcons.calculate,
                 color: AppTheme.neonPurple,
                 onTap: () => (context.findAncestorStateOfType<_DashboardScreenState>())?._onNavTap(4),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String icon;
  final Color color;
  final VoidCallback onTap;

  const _FeatureCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: GlassCard(
        borderRadius: 20,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: SvgPicture.string(icon, width: 24, colorFilter: ColorFilter.mode(color, BlendMode.srcIn)),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}
