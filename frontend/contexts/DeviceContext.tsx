import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface DeviceContextType {
  deviceMode: 'tv' | 'mobile' | null;
  setDeviceMode: (mode: 'tv' | 'mobile') => Promise<void>;
  isTV: boolean;
  hasSelectedDevice: boolean;
}

const DeviceContext = createContext<DeviceContextType>({
  deviceMode: null,
  setDeviceMode: async () => {},
  isTV: false,
  hasSelectedDevice: false,
});

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({ children }: { children: React.ReactNode }) => {
  const [deviceMode, setDeviceModeState] = useState<'tv' | 'mobile' | null>(null);
  const [hasSelectedDevice, setHasSelectedDevice] = useState(false);

  useEffect(() => {
    loadDeviceMode();
  }, []);

  const loadDeviceMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('device_mode');
      if (savedMode) {
        setDeviceModeState(savedMode as 'tv' | 'mobile');
        setHasSelectedDevice(true);
      } else {
        // Auto-detect si possible
        if (Platform.isTV) {
          setDeviceModeState('tv');
          setHasSelectedDevice(true);
          await AsyncStorage.setItem('device_mode', 'tv');
        } else {
          setHasSelectedDevice(false);
        }
      }
    } catch (error) {
      console.error('Error loading device mode:', error);
    }
  };

  const setDeviceMode = async (mode: 'tv' | 'mobile') => {
    try {
      await AsyncStorage.setItem('device_mode', mode);
      setDeviceModeState(mode);
      setHasSelectedDevice(true);
    } catch (error) {
      console.error('Error saving device mode:', error);
    }
  };

  const isTV = deviceMode === 'tv' || Platform.isTV;

  return (
    <DeviceContext.Provider value={{ deviceMode, setDeviceMode, isTV, hasSelectedDevice }}>
      {children}
    </DeviceContext.Provider>
  );
};
