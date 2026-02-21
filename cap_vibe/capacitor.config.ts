import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'au.edu.act.cgs.lplate',
  appName: 'L-Plate Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      // iOS requires permission descriptions in Info.plist
    },
    Motion: {},
  },
};

export default config;
