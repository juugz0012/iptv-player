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

// Xtream Config API - to get credentials from admin panel
export const xtreamConfigAPI = {
  getConfig: () => api.get('/admin/xtream-config'),
};

// Xtream Codes Direct API - calls DIRECTLY from mobile using credentials from backend
let xtreamConfig: any = null;

const getXtreamConfig = async () => {
  if (!xtreamConfig) {
    const response = await xtreamConfigAPI.getConfig();
    if (response.data.configured) {
      xtreamConfig = {
        baseURL: response.data.dns_url,
        username: response.data.username,
        password: response.data.password, // Note: password not returned by backend for security
      };
    }
  }
  return xtreamConfig;
};

// For M3U parsing
const parseM3U = (m3uContent: string) => {
  const lines = m3uContent.split('\n');
  const channels: any[] = [];
  let currentChannel: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      currentChannel = {};
      
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      
      if (tvgIdMatch) currentChannel.stream_id = tvgIdMatch[1];
      if (tvgNameMatch) currentChannel.name = tvgNameMatch[1];
      if (tvgLogoMatch) currentChannel.stream_icon = tvgLogoMatch[1];
      if (groupTitleMatch) currentChannel.category_id = groupTitleMatch[1];
      
      if (!currentChannel.name) {
        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) currentChannel.name = nameMatch[1].trim();
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      currentChannel.stream_url = line;
      
      if (!currentChannel.stream_id) {
        const idMatch = line.match(/\/(\d+)\./);
        if (idMatch) currentChannel.stream_id = parseInt(idMatch[1]);
      }
      
      if (!currentChannel.stream_id) {
        currentChannel.stream_id = channels.length + 1;
      }
      if (!currentChannel.category_id) {
        currentChannel.category_id = '';
      }
      
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
};

// Cache for M3U data
let cachedM3UChannels: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const loadM3U = async () => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedM3UChannels && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📦 Utilisation du cache M3U');
    return cachedM3UChannels;
  }
  
  // Load fresh M3U data
  const XTREAM_BASE_URL = 'http://uvihkgki.leadernoob.xyz';
  const XTREAM_USERNAME = 'GYNRNT4N';
  const XTREAM_PASSWORD = 'WL29K25J';
  
  const url = `${XTREAM_BASE_URL}/get.php?username=${XTREAM_USERNAME}&password=${XTREAM_PASSWORD}&type=m3u_plus&output=mpegts`;
  
  console.log('🔄 Chargement M3U depuis:', url);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
      'Accept': '*/*',
    },
    signal: controller.signal,
  });
  
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  console.log('✅ M3U reçu, parsing en cours...');
  const m3uContent = await response.text();
  console.log('📄 Taille M3U:', m3uContent.length, 'caractères');
  
  const channels = parseM3U(m3uContent);
  console.log('✅ Parsing terminé:', channels.length, 'chaînes trouvées');
  
  // Cache the results
  cachedM3UChannels = channels;
  cacheTimestamp = now;
  
  return channels;
};

// Direct M3U approach - more reliable
export const xtreamAPI = {
  getLiveStreams: async (categoryId?: string) => {
    try {
      const channels = await loadM3U();
      
      if (categoryId && categoryId !== '') {
        const filtered = channels.filter((ch: any) => ch.category_id === categoryId);
        console.log('🔍 Filtrage par catégorie:', categoryId, '→', filtered.length, 'chaînes');
        return { data: filtered };
      }
      
      return { data: channels };
    } catch (error: any) {
      console.error('❌ Erreur chargement M3U:', error.message);
      if (error.name === 'AbortError') {
        throw new Error('Timeout: le serveur IPTV met trop de temps à répondre');
      }
      throw error;
    }
  },
  
  getLiveCategories: async () => {
    try {
      const channels = await loadM3U();
      
      const categoriesMap = new Map();
      channels.forEach((ch: any) => {
        if (ch.category_id && !categoriesMap.has(ch.category_id)) {
          categoriesMap.set(ch.category_id, {
            category_id: ch.category_id,
            category_name: ch.category_id,
            parent_id: 0
          });
        }
      });
      
      const categories = Array.from(categoriesMap.values());
      console.log('📂 Catégories extraites:', categories.length);
      
      return { data: categories };
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
  
  getInfo: () => api.get('/xtream/info'),
  getVodCategories: () => api.get('/xtream/vod-categories'),
  getVodStreams: (categoryId?: string) => api.get('/xtream/vod-streams', { params: { category_id: categoryId } }),
  getSeriesCategories: () => api.get('/xtream/series-categories'),
  getSeriesStreams: (categoryId?: string) => api.get('/xtream/series-streams', { params: { category_id: categoryId } }),
  getSeriesInfo: (seriesId: string) => api.get(`/xtream/series-info/${seriesId}`),
  getVodInfo: (vodId: string) => api.get(`/xtream/vod-info/${vodId}`),
  getEPG: (streamId: string) => api.get(`/xtream/epg/${streamId}`),
  getStreamUrl: (streamType: string, streamId: string, extension: string = 'm3u8') => {
    const XTREAM_BASE_URL = 'http://uvihkgki.leadernoob.xyz';
    const XTREAM_USERNAME = 'GYNRNT4N';
    const XTREAM_PASSWORD = 'WL29K25J';
    
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
