import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Profile {
  id: string;
  name: string;
  is_child: boolean;
  avatar?: string;
  user_code: string;
}

interface AuthContextType {
  userCode: string | null;
  currentProfile: Profile | null;
  setUserCode: (code: string) => Promise<void>;
  setCurrentProfile: (profile: Profile | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userCode, setUserCodeState] = useState<string | null>(null);
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const code = await AsyncStorage.getItem('userCode');
      const profile = await AsyncStorage.getItem('currentProfile');
      
      if (code) setUserCodeState(code);
      if (profile) setCurrentProfileState(JSON.parse(profile));
    } catch (error) {
      console.error('Error loading auth data:', error);
    }
  };

  const setUserCode = async (code: string) => {
    try {
      await AsyncStorage.setItem('userCode', code);
      setUserCodeState(code);
    } catch (error) {
      console.error('Error saving user code:', error);
    }
  };

  const setCurrentProfile = async (profile: Profile | null) => {
    try {
      if (profile) {
        await AsyncStorage.setItem('currentProfile', JSON.stringify(profile));
      } else {
        await AsyncStorage.removeItem('currentProfile');
      }
      setCurrentProfileState(profile);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userCode');
      await AsyncStorage.removeItem('currentProfile');
      setUserCodeState(null);
      setCurrentProfileState(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ userCode, currentProfile, setUserCode, setCurrentProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
