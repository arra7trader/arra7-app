import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arra7.app',
  appName: 'ARRA7',
  webDir: 'out',
  server: {
    url: 'https://arra7-app.vercel.app',
    cleartext: true,
    // Handle all navigation inside the app
    androidScheme: 'https',
    hostname: 'arra7-app.vercel.app'
  },
  android: {
    backgroundColor: '#0A0E14',
    allowMixedContent: true,
    // Capture all URLs and handle them in WebView
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0A0E14',
      showSpinner: false
    },
    Browser: {
      // Use in-app browser for OAuth
      windowOpen: '_self'
    }
  }
};

export default config;
