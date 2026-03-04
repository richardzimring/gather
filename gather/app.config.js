const IS_DEV = process.env.APP_ENV === 'development';

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: IS_DEV ? 'Gather (Dev)' : 'Gather',
  slug: 'gather',
  version: '1.1.1',
  orientation: 'portrait',
  scheme: IS_DEV ? 'gather-dev' : 'gather',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    usesAppleSignIn: true,
    bundleIdentifier: IS_DEV
      ? 'com.richardzimring.gather.dev'
      : 'com.richardzimring.gather',
    buildNumber: '1',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'We need your location to help you find nearby places for events.',
      NSCalendarsUsageDescription:
        'Gather reads your calendar to find times when you and your friends are all free.',
      ITSAppUsesNonExemptEncryption: false,
    },
    icon: {
      light: './assets/images/icon-light.png',
      dark: './assets/images/icon-dark.png',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon-dark.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#f0ece5',
        dark: {
          image: './assets/images/splash-icon-light.png',
          backgroundColor: '#000000',
        },
      },
    ],
    'expo-secure-store',
    '@react-native-community/datetimepicker',
    'expo-apple-authentication',
    'expo-notifications',
    'expo-calendar',
    'expo-font',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '67421a2d-b7fc-490d-a430-574f2e91e0d3',
    },
  },
  owner: 'richard-zimring',
};

export default config;
