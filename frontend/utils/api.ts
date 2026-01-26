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

// Xtream Codes M3U API - More reliable than player_api.php
const XTREAM_BASE_URL = 'http://uwmuyyff.leadernoob.xyz';
const XTREAM_USERNAME = 'C9FFWBSS';
const XTREAM_PASSWORD = '13R3ZLL9';

// Helper function to parse M3U playlist
const parseM3U = (m3uContent: string) => {
  const lines = m3uContent.split('\n');
  const channels: any[] = [];
  let currentChannel: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Parse channel info
      currentChannel = {};
      
      // Extract tvg-id, tvg-name, tvg-logo, group-title
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      
      if (tvgIdMatch) currentChannel.stream_id = tvgIdMatch[1];
      if (tvgNameMatch) currentChannel.name = tvgNameMatch[1];
      if (tvgLogoMatch) currentChannel.stream_icon = tvgLogoMatch[1];
      if (groupTitleMatch) currentChannel.category_name = groupTitleMatch[1];
      
      // Extract name from end of line if not found
      if (!currentChannel.name) {
        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) currentChannel.name = nameMatch[1].trim();
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      // This is the stream URL
      currentChannel.stream_url = line;
      
      // Extract stream_id from URL if not found
      if (!currentChannel.stream_id) {
        const idMatch = line.match(/\/(\d+)\./);
        if (idMatch) currentChannel.stream_id = parseInt(idMatch[1]);
      }
      
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
};

const xtreamDirect = axios.create({
  baseURL: XTREAM_BASE_URL,
  timeout: 30000,
  headers: {
    'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
    'Accept': '*/*',
  }
});

export const xtreamAPI = {
  // Get M3U playlist and parse it
  getLiveStreams: async (categoryId?: string) => {
    try {
      const response = await xtreamDirect.get('/get.php', {
        params: {
          username: XTREAM_USERNAME,
          password: XTREAM_PASSWORD,
          type: 'm3u_plus',
          output: 'ts'
        }
      });
      
      const channels = parseM3U(response.data);
      
      // Filter by category if specified
      if (categoryId && categoryId !== '') {
        return { data: channels.filter((ch: any) => ch.category_name === categoryId) };
      }
      
      return { data: channels };
    } catch (error) {
      console.error('Error fetching M3U:', error);
      throw error;
    }
  },
  
  // Get unique categories from M3U
  getLiveCategories: async () => {
    try {
      const response = await xtreamDirect.get('/get.php', {
        params: {
          username: XTREAM_USERNAME,
          password: XTREAM_PASSWORD,
          type: 'm3u_plus',
          output: 'ts'
        }
      });
      
      const channels = parseM3U(response.data);
      
      // Extract unique categories
      const categoriesMap = new Map();
      channels.forEach((ch: any) => {
        if (ch.category_name && !categoriesMap.has(ch.category_name)) {
          categoriesMap.set(ch.category_name, {
            category_id: ch.category_name,
            category_name: ch.category_name,
            parent_id: 0
          });
        }
      });
      
      return { data: Array.from(categoriesMap.values()) };
    } catch (error) {
      console.error('Error fetching categories from M3U:', error);
      throw error;
    }
  },
  
  getInfo: () => xtreamDirect.get('/player_api.php', { 
    params: { username: XTREAM_USERNAME, password: XTREAM_PASSWORD } 
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
