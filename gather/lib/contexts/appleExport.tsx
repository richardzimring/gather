import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getOrCreateGatherCalendar,
  deleteGatherCalendar,
  requestCalendarPermissions,
  hasCalendarPermissions,
} from '../services/calendar';

const APPLE_EXPORT_ENABLED_KEY = '@gather/apple_export_enabled';

interface AppleExportContextValue {
  enabled: boolean;
  isLoading: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

const AppleExportContext = createContext<AppleExportContextValue | null>(null);

export function AppleExportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(APPLE_EXPORT_ENABLED_KEY)
      .then((val) => setEnabled(val === 'true'))
      .finally(() => setIsLoading(false));
  }, []);

  const enable = useCallback(async () => {
    const hasPerms = await hasCalendarPermissions();
    if (!hasPerms) {
      const granted = await requestCalendarPermissions();
      if (!granted) throw new Error('Calendar permission denied');
    }
    await getOrCreateGatherCalendar();
    await AsyncStorage.setItem(APPLE_EXPORT_ENABLED_KEY, 'true');
    setEnabled(true);
  }, []);

  const disable = useCallback(async () => {
    await deleteGatherCalendar();
    await AsyncStorage.setItem(APPLE_EXPORT_ENABLED_KEY, 'false');
    setEnabled(false);
  }, []);

  return (
    <AppleExportContext.Provider
      value={{ enabled, isLoading, enable, disable }}
    >
      {children}
    </AppleExportContext.Provider>
  );
}

export function useAppleExportContext(): AppleExportContextValue {
  const ctx = useContext(AppleExportContext);
  if (!ctx) {
    throw new Error(
      'useAppleExportContext must be used within AppleExportProvider',
    );
  }
  return ctx;
}
