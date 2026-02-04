import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/user_model.dart';
import '../widgets/glass_card.dart';

/// Widget to display user quota status
class QuotaIndicator extends StatelessWidget {
  final QuotaStatus quota;

  const QuotaIndicator({
    super.key,
    required this.quota,
  });

  @override
  Widget build(BuildContext context) {
    final isVvip = quota.membership == 'VVIP';
    final isPro = quota.membership == 'PRO';
    
    Color badgeColor;
    
    if (isVvip) {
      badgeColor = AppTheme.neonGold;
    } else if (isPro) {
      badgeColor = AppTheme.neonBlue;
    } else {
      badgeColor = Colors.grey;
    }
    
    return GlassCard(
      padding: const EdgeInsets.all(12),
      borderRadius: 12,
      opacity: 0.1,
      borderColor: badgeColor.withOpacity(0.3),
      child: Row(
        children: [
          // Membership Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: badgeColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: badgeColor.withOpacity(0.5)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isVvip) 
                  Icon(Icons.workspace_premium, size: 14, color: badgeColor)
                else if (isPro)
                  Icon(Icons.star, size: 14, color: badgeColor),
                if (isVvip || isPro) const SizedBox(width: 4),
                Text(
                  quota.membership,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: badgeColor,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(width: 12),
          
          // Label
          const Text(
            'Usage',
            style: TextStyle(fontSize: 12, color: Colors.white54),
          ),
          
          const Spacer(),
          
          // Progress Bar
          if (!quota.isUnlimited) ...[
            SizedBox(
              width: 60,
              height: 4,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: quota.usagePercent / 100,
                  backgroundColor: Colors.white10,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    quota.remaining == 0 ? AppTheme.neonRed : badgeColor,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
          ],
          
          // Count
          Text(
            quota.isUnlimited
                ? '∞'
                : '${quota.used}/${quota.dailyLimit}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
              color: quota.isUnlimited
                  ? AppTheme.neonGold
                  : quota.remaining > 0 
                      ? Colors.white 
                      : AppTheme.neonRed,
            ),
          ),
        ],
      ),
    );
  }
}
