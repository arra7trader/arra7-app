/// API Endpoints for ARRA7 Backend
class ApiEndpoints {
  static const String baseUrl = 'https://arra7-app.vercel.app';
  
  // Auth
  static const String signIn = '/api/auth/signin';
  static const String signOut = '/api/auth/signout';
  static const String session = '/api/auth/session';
  
  // User
  static const String userQuota = '/api/user/quota';
  static const String userProfile = '/api/user/profile';
  
  // Market Analysis
  static const String analyze = '/api/analyze';
  static const String analyzeMtf = '/api/analyze-mtf';
  static const String news = '/api/news';
  
  // Stock Analysis
  static const String stockData = '/api/stock/data';
  static const String stockAnalyze = '/api/stock/analyze';
  static const String stockQuota = '/api/stock/quota';
  
  // Market Data
  static const String marketData = '/api/market';
  
  // Payment
  static const String paymentCreate = '/api/payment/create';
  static const String paymentStatus = '/api/payment/status';
}
