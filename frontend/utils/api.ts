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

// Xtream APIs via backend proxy - credentials managed by admin panel
export const xtreamAPI = {
  getInfo: () => api.get('/xtream/info'),
  getLiveCategories: () => api.get('/xtream/live-categories'),
  getLiveStreams: (categoryId?: string) => api.get('/xtream/live-streams', { params: { category_id: categoryId } }),
  getVodCategories: () => api.get('/xtream/vod-categories'),
  getVodStreams: (categoryId?: string) => api.get('/xtream/vod-streams', { params: { category_id: categoryId } }),
  getSeriesCategories: () => api.get('/xtream/series-categories'),
  getSeriesStreams: (categoryId?: string) => api.get('/xtream/series-streams', { params: { category_id: categoryId } }),
  getSeriesInfo: (seriesId: string) => api.get(`/xtream/series-info/${seriesId}`),
  getVodInfo: (vodId: string) => api.get(`/xtream/vod-info/${vodId}`),
  getEPG: (streamId: string) => api.get(`/xtream/epg/${streamId}`),
  getStreamUrl: (streamType: string, streamId: string, extension: string = 'm3u8') => 
    api.get(`/xtream/stream-url/${streamType}/${streamId}`, { params: { extension } }),
};
