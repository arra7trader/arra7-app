import 'package:flutter/material.dart';
import 'dart:ui';
import '../theme/app_theme.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final double opacity;
  final double borderRadius;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color tint;
  final Color borderColor;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.opacity = 0.05,
    this.borderRadius = 24,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.tint = Colors.white,
    this.borderColor = Colors.white10,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Determine the border color based on theme brightness if not overridden
    // but here we default to cyber theme style
    
    Widget content = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: padding,
          decoration: AppTheme.glassDecoration(
            opacity: opacity,
            radius: borderRadius,
            tint: tint,
            borderColor: borderColor,
          ),
          child: child,
        ),
      ),
    );

    if (margin != null) {
      content = Padding(padding: margin!, child: content);
    }
    
    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: content,
        ),
      );
    }

    return content;
  }
}
