import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6ffb024a97f449e7aaec7f419897c27c',
  appName: 'Memory Helper',
  webDir: 'dist',
  server: {
    url: 'https://6ffb024a-97f4-49e7-aaec-7f419897c27c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    // Camera permissions
    Permissions: {
      camera: 'Camera access is needed to recognize people around you',
    },
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
