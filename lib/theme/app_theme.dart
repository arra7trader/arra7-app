import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ARRA7 Cyber Financial Premium Theme
class AppTheme {
  // --- Cyber Palette ---
  static const Color bgDarkest = Color(0xFF020408); // Hampir hitam
  static const Color bgDark = Color(0xFF090B12);    // Background utama
  static const Color bgCard = Color(0xFF131620);    // Card base
  static const Color backgroundDark = Color(0xFF020408); // Alias for bgDarkest

  static const Color textMuted = Color(0xFF9CA3AF); // Muted Text
  
  // Accents
  static const Color neonBlue = Color(0xFF00E5FF);
  static const Color neonPurple = Color(0xFFBD00FF);
  static const Color neonGreen = Color(0xFF00FF94);
  static const Color neonRed = Color(0xFFFF0055);
  static const Color neonGold = Color(0xFFFFD700);
  
  // Gradients
  static const LinearGradient cyberGradient = LinearGradient(
    colors: [Color(0xFF00C6FF), Color(0xFF0072FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient purpleGradient = LinearGradient(
    colors: [Color(0xFFDA22FF), Color(0xFF9733EE)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFFFD700), Color(0xFFFDB931)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient greenGradient = LinearGradient(
    colors: [Color(0xFF00FF94), Color(0xFF00BFA5)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  // Glassmorphism Utilities
  static BoxDecoration glassDecoration({
    Color tint = Colors.white,
    double opacity = 0.05,
    double radius = 24,
    Color borderColor = Colors.white10,
  }) {
    return BoxDecoration(
      color: tint.withOpacity(opacity),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.2),
          blurRadius: 10,
          spreadRadius: -2,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  static ThemeData get premiumTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgDarkest,
      primaryColor: neonBlue,
      
      // Font: Orbitron for headers, Inter for body
      textTheme: TextTheme(
        displayLarge: GoogleFonts.orbitron(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
        displayMedium: GoogleFonts.orbitron(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        titleLarge: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        bodyLarge: GoogleFonts.inter(fontSize: 16, color: Colors.white70),
        bodyMedium: GoogleFonts.inter(fontSize: 14, color: Colors.white60),
      ),
      
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.orbitron(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Colors.white,
          letterSpacing: 2,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      
      colorScheme: const ColorScheme.dark(
        primary: neonBlue,
        secondary: neonPurple,
        surface: bgCard,
        error: neonRed,
      ),
    );
  }
}
