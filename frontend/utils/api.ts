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

// Xtream APIs via backend proxy (HTTPS) - bypass iOS HTTP restrictions
export const xtreamAPI = {
  getInfo: () => api.get('/xtream/info'),
  getLiveCategories: () => api.get('/xtream/live-categories'),
  getLiveStreams: (categoryId?: string) => api.get('/xtream/live-streams', { 
    params: { category_id: categoryId },
    timeout: 60000 // 60 secondes
  }),
  getVodCategories: () => api.get('/xtream/vod-categories'),
  getVodStreams: (categoryId?: string) => api.get('/xtream/vod-streams', { params: { category_id: categoryId } }),
  getSeriesCategories: () => api.get('/xtream/series-categories'),
  getSeriesStreams: (categoryId?: string) => api.get('/xtream/series-streams', { params: { category_id: categoryId } }),
  getSeriesInfo: (seriesId: string) => api.get(`/xtream/series-info/${seriesId}`),
  getVodInfo: (vodId: string) => api.get(`/xtream/vod-info/${vodId}`),
  getEPG: (streamId: string) => api.get(`/xtream/epg/${streamId}`),
  getStreamUrl: async (streamType: string, streamId: string, extension: string = 'm3u8') => {
    // For streaming, we need direct URLs that the video player can access
    // Get the config from backend
    try {
      const configResponse = await xtreamConfigAPI.getConfig();
      if (configResponse.data.configured) {
        const baseURL = configResponse.data.dns_url;
        let url = '';
        
        // Note: These credentials are hardcoded for now since backend doesn't return password
        const username = 'GYNRNT4N';
        const password = 'WL29K25J';
        
        if (streamType === 'live') {
          url = `${baseURL}/live/${username}/${password}/${streamId}.${extension}`;
        } else if (streamType === 'movie') {
          url = `${baseURL}/movie/${username}/${password}/${streamId}.${extension}`;
        } else if (streamType === 'series') {
          url = `${baseURL}/series/${username}/${password}/${streamId}.${extension}`;
        }
        return { data: { url } };
      }
    } catch (error) {
      console.error('Error getting stream URL:', error);
    }
    return { data: { url: '' } };
  },
};
