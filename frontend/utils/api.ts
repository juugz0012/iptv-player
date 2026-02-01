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
  createUserCode: (maxProfiles: number = 5, userNote: string = '') => 
    api.post('/admin/user-codes', { max_profiles: maxProfiles, user_note: userNote }),
  listUserCodes: () => api.get('/admin/user-codes'),
  deleteUserCode: (code: string) => api.delete(`/admin/user-codes/${code}`),
  // New: Create user with Xtream verification in one step
  createUserWithXtream: (config: { dns_url: string; username: string; password: string; samsung_lg_dns?: string }, maxProfiles: number = 5) => 
    api.post('/admin/create-user-with-xtream', config, { params: { max_profiles: maxProfiles } }),
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

// ==================== XTREAM DIRECT API ====================
// All calls go directly from the app to the Xtream server (bypasses Cloudflare blocks)

interface XtreamCredentials {
  dns_url: string;
  username: string;
  password: string;
}

let cachedCredentials: XtreamCredentials | null = null;

// Get Xtream credentials from backend
async function getXtreamCredentials(): Promise<XtreamCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const response = await xtreamConfigAPI.getConfig();
  if (!response.data.configured) {
    throw new Error('Xtream configuration not found. Please configure in admin panel.');
  }

  cachedCredentials = {
    dns_url: response.data.dns_url,
    username: response.data.username,
    password: response.data.password,
  };

  return cachedCredentials;
}

// Direct Xtream API calls
export const xtreamAPI = {
  /**
   * Get account info
   */
  getInfo: async () => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const response = await axios.get(url, {
      params: {
        username: credentials.username,
        password: credentials.password,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 30000,
    });
    
    return response;
  },

  /**
   * Get live TV categories
   */
  getLiveCategories: async () => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const response = await axios.get(url, {
      params: {
        username: credentials.username,
        password: credentials.password,
        action: 'get_live_categories',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 30000,
    });
    
    return response;
  },

  /**
   * Get live TV streams
   */
  getLiveStreams: async (categoryId?: string) => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const params: any = {
      username: credentials.username,
      password: credentials.password,
      action: 'get_live_streams',
    };
    
    if (categoryId) {
      params.category_id = categoryId;
    }
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 60000,
    });
    
    return response;
  },

  /**
   * Get VOD categories
   */
  getVodCategories: async () => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const response = await axios.get(url, {
      params: {
        username: credentials.username,
        password: credentials.password,
        action: 'get_vod_categories',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 30000,
    });
    
    return response;
  },

  /**
   * Get VOD streams
   */
  getVodStreams: async (categoryId?: string) => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const params: any = {
      username: credentials.username,
      password: credentials.password,
      action: 'get_vod_streams',
    };
    
    if (categoryId) {
      params.category_id = categoryId;
    }
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 60000,
    });
    
    return response;
  },

  /**
   * Get series categories
   */
  getSeriesCategories: async () => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const response = await axios.get(url, {
      params: {
        username: credentials.username,
        password: credentials.password,
        action: 'get_series_categories',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 30000,
    });
    
    return response;
  },

  /**
   * Get series streams
   */
  getSeriesStreams: async (categoryId?: string) => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const params: any = {
      username: credentials.username,
      password: credentials.password,
      action: 'get_series',
    };
    
    if (categoryId) {
      params.category_id = categoryId;
    }
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 60000,
    });
    
    return response;
  },

  /**
   * Get series info (episodes, seasons)
   */
  getSeriesInfo: async (seriesId: string) => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const response = await axios.get(url, {
      params: {
        username: credentials.username,
        password: credentials.password,
        action: 'get_series_info',
        series_id: seriesId,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 30000,
    });
    
    return response;
  },

  /**
   * Get VOD info (movie details)
   */
  getVodInfo: async (vodId: string) => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const response = await axios.get(url, {
      params: {
        username: credentials.username,
        password: credentials.password,
        action: 'get_vod_info',
        vod_id: vodId,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 30000,
    });
    
    return response;
  },

  /**
   * Get EPG for a stream
   */
  getEPG: async (streamId: string) => {
    const credentials = await getXtreamCredentials();
    const url = `${credentials.dns_url}/player_api.php`;
    
    const response = await axios.get(url, {
      params: {
        username: credentials.username,
        password: credentials.password,
        action: 'get_short_epg',
        stream_id: streamId,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 30000,
    });
    
    return response;
  },

  /**
   * Get direct stream URL for playback
   */
  getStreamUrl: async (streamType: string, streamId: string, extension: string = 'm3u8') => {
    const credentials = await getXtreamCredentials();
    
    let url = '';
    if (streamType === 'live') {
      url = `${credentials.dns_url}/live/${credentials.username}/${credentials.password}/${streamId}.${extension}`;
    } else if (streamType === 'movie') {
      url = `${credentials.dns_url}/movie/${credentials.username}/${credentials.password}/${streamId}.${extension}`;
    } else if (streamType === 'series') {
      url = `${credentials.dns_url}/series/${credentials.username}/${credentials.password}/${streamId}.${extension}`;
    }
    
    return { data: { url } };
  },

  /**
   * Clear cached credentials (useful when config changes)
   */
  clearCache: () => {
    cachedCredentials = null;
  },
};
