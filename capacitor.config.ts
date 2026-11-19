import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tehrandash.game',
  appName: 'Tehran Dash 3D',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
