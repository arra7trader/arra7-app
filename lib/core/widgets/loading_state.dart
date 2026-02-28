import 'package:flutter/material.dart';

class LoadingState extends StatelessWidget {
  final String message;
  final double size;

  const LoadingState({
    super.key,
    this.message = 'Memuat...',
    this.size = 26,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: size,
          width: size,
          child: const CircularProgressIndicator(strokeWidth: 2.5),
        ),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
      ],
    );
  }
}
