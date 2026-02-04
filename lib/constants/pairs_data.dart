/// Trading pairs data organized by category
class PairsData {
  static const List<PairCategory> categories = [
    PairCategory(
      id: 'major',
      name: 'Forex Major',
      icon: '💱',
      pairs: [
        TradingPair(value: 'EURUSD', label: 'EUR/USD'),
        TradingPair(value: 'GBPUSD', label: 'GBP/USD'),
        TradingPair(value: 'USDJPY', label: 'USD/JPY'),
        TradingPair(value: 'USDCHF', label: 'USD/CHF'),
        TradingPair(value: 'AUDUSD', label: 'AUD/USD'),
        TradingPair(value: 'USDCAD', label: 'USD/CAD'),
        TradingPair(value: 'NZDUSD', label: 'NZD/USD'),
      ],
    ),
    PairCategory(
      id: 'minor',
      name: 'Forex Minor',
      icon: '📊',
      pairs: [
        TradingPair(value: 'EURGBP', label: 'EUR/GBP'),
        TradingPair(value: 'EURJPY', label: 'EUR/JPY'),
        TradingPair(value: 'GBPJPY', label: 'GBP/JPY'),
        TradingPair(value: 'EURCHF', label: 'EUR/CHF'),
        TradingPair(value: 'EURAUD', label: 'EUR/AUD'),
        TradingPair(value: 'AUDJPY', label: 'AUD/JPY'),
        TradingPair(value: 'CADJPY', label: 'CAD/JPY'),
        TradingPair(value: 'CHFJPY', label: 'CHF/JPY'),
      ],
    ),
    PairCategory(
      id: 'commodities',
      name: 'Komoditas',
      icon: '🥇',
      pairs: [
        TradingPair(value: 'XAUUSD', label: 'XAU/USD (Gold)'),
        TradingPair(value: 'XAGUSD', label: 'XAG/USD (Silver)'),
        TradingPair(value: 'XPTUSD', label: 'XPT/USD (Platinum)'),
        TradingPair(value: 'XTIUSD', label: 'WTI Oil'),
        TradingPair(value: 'XBRUSD', label: 'Brent Oil'),
      ],
    ),
    PairCategory(
      id: 'crypto',
      name: 'Crypto',
      icon: '₿',
      pairs: [
        TradingPair(value: 'BTCUSD', label: 'BTC/USD'),
        TradingPair(value: 'ETHUSD', label: 'ETH/USD'),
        TradingPair(value: 'XRPUSD', label: 'XRP/USD'),
        TradingPair(value: 'SOLUSD', label: 'SOL/USD'),
        TradingPair(value: 'BNBUSD', label: 'BNB/USD'),
        TradingPair(value: 'ADAUSD', label: 'ADA/USD'),
        TradingPair(value: 'DOGEUSD', label: 'DOGE/USD'),
        TradingPair(value: 'LINKUSD', label: 'LINK/USD'),
      ],
    ),
    PairCategory(
      id: 'indices',
      name: 'Indices',
      icon: '📈',
      pairs: [
        TradingPair(value: 'US30', label: 'US30 (Dow Jones)'),
        TradingPair(value: 'US500', label: 'US500 (S&P 500)'),
        TradingPair(value: 'USTEC', label: 'USTEC (Nasdaq)'),
        TradingPair(value: 'DE40', label: 'DE40 (DAX)'),
        TradingPair(value: 'UK100', label: 'UK100 (FTSE)'),
        TradingPair(value: 'JP225', label: 'JP225 (Nikkei)'),
      ],
    ),
  ];
}

class PairCategory {
  final String id;
  final String name;
  final String icon;
  final List<TradingPair> pairs;

  const PairCategory({
    required this.id,
    required this.name,
    required this.icon,
    required this.pairs,
  });
}

class TradingPair {
  final String value;
  final String label;

  const TradingPair({
    required this.value,
    required this.label,
  });
}
