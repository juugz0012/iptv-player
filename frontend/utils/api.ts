import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
});

// Admin APIs
export const adminAPI = {
  saveXtreamConfig: (config: any) => api.post('/admin/xtream-config', config),
  getXtreamConfig: () => api.get('/admin/xtream-config'),
  createUserCode: (maxProfiles: number = 5) => api.post('/admin/user-codes', { max_profiles: maxProfiles }),
  listUserCodes: () => api.get('/admin/user-codes'),
  deleteUserCode: (code: string) => api.delete(`/admin/user-codes/${code}`),
};

// Auth APIs
export const authAPI = {
  verifyCode: (code: string) => api.post(`/auth/verify-code?code=${code}`),
};

// Profile APIs
export const profileAPI = {
  getProfiles: (userCode: string) => api.get(`/profiles/${userCode}`),
  createProfile: (userCode: string, profile: any) => api.post(`/profiles/${userCode}`, profile),
  deleteProfile: (profileId: string) => api.delete(`/profiles/${profileId}`),
  updateParentalPin: (profileId: string, pin: string) => api.put(`/profiles/${profileId}/parental-pin`, { pin }),
  verifyParentalPin: (profileId: string, pin: string) => api.post(`/profiles/${profileId}/verify-pin`, { pin }),
};

// Xtream Codes Direct API (bypassing backend to avoid datacenter blocks)
const XTREAM_BASE_URL = 'http://uwmuyyff.leadernoob.xyz';
const XTREAM_USERNAME = 'C9FFWBSS';
const XTREAM_PASSWORD = '13R3ZLL9';

const xtreamDirect = axios.create({
  baseURL: XTREAM_BASE_URL,
  timeout: 30000,
});

export const xtreamAPI = {
  getInfo: () => xtreamDirect.get('/player_api.php', { 
    params: { username: XTREAM_USERNAME, password: XTREAM_PASSWORD } 
  }),
  getLiveCategories: () => xtreamDirect.get('/player_api.php', { 
    params: { username: XTREAM_USERNAME, password: XTREAM_PASSWORD, action: 'get_live_categories' } 
  }),
  getLiveStreams: (categoryId?: string) => xtreamDirect.get('/player_api.php', { 
    params: { 
      username: XTREAM_USERNAME, 
      password: XTREAM_PASSWORD, 
      action: 'get_live_streams',
      ...(categoryId && { category_id: categoryId })
    } 
  }),
  getVodCategories: () => xtreamDirect.get('/player_api.php', { 
    params: { username: XTREAM_USERNAME, password: XTREAM_PASSWORD, action: 'get_vod_categories' } 
  }),
  getVodStreams: (categoryId?: string) => xtreamDirect.get('/player_api.php', { 
    params: { 
      username: XTREAM_USERNAME, 
      password: XTREAM_PASSWORD, 
      action: 'get_vod_streams',
      ...(categoryId && { category_id: categoryId })
    } 
  }),
  getSeriesCategories: () => xtreamDirect.get('/player_api.php', { 
    params: { username: XTREAM_USERNAME, password: XTREAM_PASSWORD, action: 'get_series_categories' } 
  }),
  getSeriesStreams: (categoryId?: string) => xtreamDirect.get('/player_api.php', { 
    params: { 
      username: XTREAM_USERNAME, 
      password: XTREAM_PASSWORD, 
      action: 'get_series',
      ...(categoryId && { category_id: categoryId })
    } 
  }),
  getSeriesInfo: (seriesId: string) => xtreamDirect.get('/player_api.php', { 
    params: { 
      username: XTREAM_USERNAME, 
      password: XTREAM_PASSWORD, 
      action: 'get_series_info',
      series_id: seriesId
    } 
  }),
  getVodInfo: (vodId: string) => xtreamDirect.get('/player_api.php', { 
    params: { 
      username: XTREAM_USERNAME, 
      password: XTREAM_PASSWORD, 
      action: 'get_vod_info',
      vod_id: vodId
    } 
  }),
  getEPG: (streamId: string) => xtreamDirect.get('/player_api.php', { 
    params: { 
      username: XTREAM_USERNAME, 
      password: XTREAM_PASSWORD, 
      action: 'get_short_epg',
      stream_id: streamId
    } 
  }),
  getStreamUrl: (streamType: string, streamId: string, extension: string = 'm3u8') => {
    let url = '';
    if (streamType === 'live') {
      url = `${XTREAM_BASE_URL}/live/${XTREAM_USERNAME}/${XTREAM_PASSWORD}/${streamId}.${extension}`;
    } else if (streamType === 'movie') {
      url = `${XTREAM_BASE_URL}/movie/${XTREAM_USERNAME}/${XTREAM_PASSWORD}/${streamId}.${extension}`;
    } else if (streamType === 'series') {
      url = `${XTREAM_BASE_URL}/series/${XTREAM_USERNAME}/${XTREAM_PASSWORD}/${streamId}.${extension}`;
    }
    return Promise.resolve({ data: { url } });
  },
};
