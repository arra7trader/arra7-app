class Env {
  static const String defaultBaseUrl = 'https://arra7-app.vercel.app';
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: defaultBaseUrl);

  static const String googleServerClientId =
      String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID', defaultValue: '');

  static const bool debugLogs =
      bool.fromEnvironment('APP_DEBUG_LOGS', defaultValue: false);
}
