import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_theme.dart';
import '../theme/app_icons.dart';
import '../widgets/glass_card.dart';
import '../models/fibonacci.dart';

class FibonacciKanjiScreen extends StatefulWidget {
  const FibonacciKanjiScreen({super.key});

  @override
  State<FibonacciKanjiScreen> createState() => _FibonacciKanjiScreenState();
}

class _FibonacciKanjiScreenState extends State<FibonacciKanjiScreen> {
  final _highController = TextEditingController();
  final _lowController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  FibonacciCalculation? _fibonacci;
  
  @override
  void dispose() {
    _highController.dispose();
    _lowController.dispose();
    super.dispose();
  }

  void _calculate() {
    if (!_formKey.currentState!.validate()) return;

    final high = double.parse(_highController.text);
    final low = double.parse(_lowController.text);

    if (high <= low) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('HIGH must be greater than LOW'),
          backgroundColor: AppTheme.neonRed,
        ),
      );
      return;
    }

    setState(() {
      _fibonacci = FibonacciCalculation.calculate(
        high: high,
        low: low,
      );
    });

    FocusScope.of(context).unfocus();
  }

  void _reset() {
    setState(() {
      _highController.clear();
      _lowController.clear();
      _fibonacci = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    GlassCard(
                      borderRadius: 12,
                      padding: const EdgeInsets.all(10),
                      child: SvgPicture.string(AppIcons.calculate, width: 24, colorFilter: const ColorFilter.mode(AppTheme.neonPurple, BlendMode.srcIn)),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'FIBONACCI KANJI',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const Text(
                          'Golden Ratio Analysis',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
                if (_fibonacci != null)
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.white),
                    onPressed: _reset,
                  ),
              ],
            ),
          ),
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Input Card
                    GlassCard(
                      child: Column(
                        children: [
                          _buildInputParam('HIGH PRICE', _highController, Icons.arrow_upward, AppTheme.neonGreen),
                          Divider(color: Colors.white.withOpacity(0.1), height: 32),
                          _buildInputParam('LOW PRICE', _lowController, Icons.arrow_downward, AppTheme.neonRed),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // Calculate Button
                    InkWell(
                      onTap: _calculate,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        decoration: BoxDecoration(
                          gradient: AppTheme.purpleGradient,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.neonPurple.withOpacity(0.3),
                              blurRadius: 20,
                              offset: const Offset(0, 5),
                            )
                          ],
                        ),
                        child: const Center(
                          child: Text(
                            'CALCULATE LEVELS',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                    
                    // Results
                    if (_fibonacci != null) ...[
                      const SizedBox(height: 24),
                      _buildResults(),
                    ],
                    
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputParam(String label, TextEditingController controller, IconData icon, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            hintText: '0.00',
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.1)),
            border: InputBorder.none,
            isDense: true,
            contentPadding: EdgeInsets.zero,
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return 'required';
            if (double.tryParse(value) == null) return 'invalid';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildResults() {
    return Column(
      children: [
        // Range Info
        GlassCard(
          opacity: 0.1,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('RANGE', style: TextStyle(color: Colors.white54)),
              Text(
                _fibonacci!.range.toStringAsFixed(2),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        
        // Chart
        SizedBox(
          height: 300,
          child: _buildChart(),
        ),
        const SizedBox(height: 16),
        
        // Levels List
        ..._fibonacci!.levels.map((level) => _buildLevelCard(level)),
      ],
    );
  }

  Widget _buildChart() {
    final fib = _fibonacci!;
    final minY = fib.low * 0.99;
    final maxY = fib.levels.last.price * 1.01;

    return LineChart(
      LineChartData(
        minY: minY,
        maxY: maxY,
        gridData: FlGridData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) => Text(
                value.toStringAsFixed(0),
                style: const TextStyle(color: Colors.white30, fontSize: 10),
              ),
            ),
          ),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [],
        extraLinesData: ExtraLinesData(
          horizontalLines: fib.levels.map((level) {
            return HorizontalLine(
              y: level.price,
              color: level.color,
              strokeWidth: 1,
              dashArray: level.ratio > 1.0 ? [5, 5] : null,
              label: HorizontalLineLabel(
                show: true,
                alignment: Alignment.centerRight,
                style: TextStyle(
                  color: level.color,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
                labelResolver: (line) => '${level.label} (${level.price.toStringAsFixed(2)})',
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildLevelCard(FibonacciLevel level) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: level.color.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: level.color.withOpacity(0.5)),
              ),
              child: Text(
                level.label,
                style: TextStyle(color: level.color, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
            const SizedBox(width: 16),
            Text(
              level.price.toStringAsFixed(4),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const Spacer(),
            if (level.label == '0.618') 
              const Icon(Icons.star, color: AppTheme.neonGold, size: 16),
          ],
        ),
      ),
    );
  }
}
