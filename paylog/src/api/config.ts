import { Platform } from 'react-native';

function getBaseUrl() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost') {
        return 'http://localhost:5000';
      }
      return window.location.origin;
    }
    return '';
  }
  return 'http://192.168.10.103:5000';
}

export const BASE_URL = getBaseUrl();
