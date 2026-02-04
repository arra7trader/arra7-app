import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/webview_container.dart';
import '../widgets/bottom_nav_bar.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  
  final List<NavItem> _navItems = [
    NavItem(
      label: 'Beranda',
      icon: Icons.home_rounded,
      url: 'https://arra7-app.vercel.app/',
    ),
    NavItem(
      label: 'Analisa',
      icon: Icons.candlestick_chart_rounded,
      url: 'https://arra7-app.vercel.app/analisa-market',
    ),
    NavItem(
      label: 'Saham',
      icon: Icons.show_chart_rounded,
      url: 'https://arra7-app.vercel.app/analisa-saham',
    ),
    NavItem(
      label: 'Depth Matrix',
      icon: Icons.grid_view_rounded,
      url: 'https://arra7-app.vercel.app/depth-matrix',
    ),
    NavItem(
      label: 'Akun',
      icon: Icons.person_rounded,
      url: 'https://arra7-app.vercel.app/login',
    ),
  ];

  void _onNavTap(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: SafeArea(
        child: IndexedStack(
          index: _currentIndex,
          children: _navItems.map((item) {
            return WebViewContainer(url: item.url);
          }).toList(),
        ),
      ),
      bottomNavigationBar: CustomBottomNavBar(
        currentIndex: _currentIndex,
        items: _navItems,
        onTap: _onNavTap,
      ),
    );
  }
}

class NavItem {
  final String label;
  final IconData icon;
  final String url;

  NavItem({
    required this.label,
    required this.icon,
    required this.url,
  });
}
