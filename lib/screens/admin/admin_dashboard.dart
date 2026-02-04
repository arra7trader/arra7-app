import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import '../../screens/login_screen.dart'; // For logout mainly

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDarkest,
      appBar: AppBar(
        title: const Text('ADMIN CONSOLE'),
        actions: [
          IconButton(
            icon: const Icon(Icons.exit_to_app, color: AppTheme.neonRed),
            onPressed: () {
               // Exit separate app logic or simple pop
               Navigator.of(context).pop(); 
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats Grid
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.5,
              children: [
                _buildStatCard('TOTAL USERS', '1,248', AppTheme.neonBlue),
                _buildStatCard('PRO MEMBERS', '843', AppTheme.neonPurple),
                _buildStatCard('ONLINE NOW', '152', AppTheme.neonGreen),
                _buildStatCard('REVENUE', '\$12.4K', AppTheme.neonGold),
              ],
            ),
            
            const SizedBox(height: 32),
            
            const Text(
              'MANAGEMENT',
              style: TextStyle(color: Colors.white54, fontSize: 12, letterSpacing: 1.5, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            
            _buildActionCard(
              icon: Icons.people_outline,
              title: 'User Management',
              subtitle: 'Approve, block, or edit users',
              color: AppTheme.neonBlue,
            ),
            const SizedBox(height: 12),
            
            _buildActionCard(
              icon: Icons.campaign_outlined,
              title: 'Broadcast Message',
              subtitle: 'Send push notifications to all',
              color: AppTheme.neonPurple,
            ),
            const SizedBox(height: 12),
            
            _buildActionCard(
              icon: Icons.settings,
              title: 'System Settings',
              subtitle: 'Configure AI thresholds',
              color: Colors.white,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return GlassCard(
      opacity: 0.1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
  
  Widget _buildActionCard({required IconData icon, required String title, required String subtitle, required Color color}) {
    return GlassCard(
      borderRadius: 16,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 12)),
            ],
          ),
          const Spacer(),
          const Icon(Icons.arrow_forward_ios, color: Colors.white24, size: 16),
        ],
      ),
    );
  }
}
