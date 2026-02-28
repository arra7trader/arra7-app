import 'package:flutter/material.dart';

class BrandLogo extends StatelessWidget {
  final double size;
  final BorderRadius? borderRadius;

  const BrandLogo({
    super.key,
    this.size = 40,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.circular(size * 0.23),
      child: Image.asset(
        'assets/images/a7_logo.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.high,
      ),
    );
  }
}

class BrandAppBarLogo extends StatelessWidget {
  final double iconSize;

  const BrandAppBarLogo({
    super.key,
    this.iconSize = 26,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: Align(
        alignment: Alignment.centerLeft,
        child: BrandLogo(size: iconSize),
      ),
    );
  }
}
