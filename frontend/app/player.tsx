import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { xtreamAPI, progressAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
  const [streamUrl, setStreamUrl] = useState('');
  const [streamExtension, setStreamExtension] = useState('m3u8');
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  
  const webViewRef = useRef<WebView>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { streamId, streamType, title, resumePosition } = params;
  const { currentProfile, userCode } = useAuth();

  useEffect(() => {
    loadStream();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });

    return () => {
      backHandler.remove();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      saveProgress();
    };
  }, []);

  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  // Save progress every 15 seconds for movies
  useEffect(() => {
    if (streamType === 'movie' && streamUrl) {
      progressInterval.current = setInterval(() => {
        setPlaybackTime(prev => prev + 15);
        saveProgress(playbackTime + 15);
      }, 15000);

      return () => {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [streamUrl, streamType]);

  const loadStream = async () => {
    try {
      setLoading(true);
      
      // Déterminer l'extension selon le type de stream
      let extension = 'm3u8';
      
      if (streamType === 'live') {
        // Pour la TV en direct, utiliser .m3u8 pour compatibilité HLS
        extension = 'm3u8';
        console.log('📺 Live TV détecté - Extension: .m3u8 (HLS)');
      } else if (streamType === 'movie') {
        // Pour les films, récupérer l'extension depuis l'API
        try {
          const movieInfo = await xtreamAPI.getVodInfo(streamId as string);
          const containerExt = movieInfo.data?.movie_data?.container_extension;
          
          if (containerExt) {
            extension = containerExt;
            console.log('📦 Container extension détecté:', extension);
          } else {
            // Utiliser mp4 par défaut pour les films
            extension = 'mp4';
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des infos:', error);
          extension = 'mp4';
        }
      } else if (streamType === 'series') {
        // Pour les séries, utiliser mp4 par défaut
        extension = 'mp4';
      }
      
      setStreamExtension(extension);
      
      const response = await xtreamAPI.getStreamUrl(
        streamType as string,
        streamId as string,
        extension
      );
      
      const url = response.data.url;
      console.log('🎬 Stream URL:', url);
      console.log('📹 Extension:', extension);
      setStreamUrl(url);
      
      if (resumePosition && parseFloat(resumePosition as string) > 0) {
        setPlaybackTime(parseFloat(resumePosition as string));
      }
    } catch (error) {
      console.error('Error loading stream:', error);
      Alert.alert(
        '❌ Erreur',
        'Impossible de charger le flux vidéo.',
        [{ text: 'Retour', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (currentTime?: number) => {
    if (!userCode || !currentProfile || streamType !== 'movie') return;
    
    try {
      const timeToSave = currentTime || playbackTime;
      await progressAPI.updateProgress(
        userCode,
        currentProfile.name,
        streamId as string,
        streamType as string,
        Math.floor(timeToSave),
        7200
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const toggleOrientation = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Info', 'La rotation n\'est pas disponible sur le web');
        return;
      }

      if (isLandscape) {
        // Revenir en portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        // Passer en paysage
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch (error) {
      console.error('Error toggling orientation:', error);
    }
  };

  const handleBack = async () => {
    // Déverrouiller l'orientation avant de quitter
    if (Platform.OS !== 'web') {
      await ScreenOrientation.unlockAsync();
    }
    
    if (streamType === 'movie') {
      await saveProgress();
    }
    router.back();
  };

  // HTML player universel - supporte HLS, MP4, MKV
  const generatePlayerHTML = () => {
    const startTime = resumePosition ? parseFloat(resumePosition as string) : 0;
    const isHLS = streamExtension === 'm3u8' || streamExtension === 'ts';
    const isLive = streamType === 'live';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  ${isHLS ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>' : ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #000;
      overflow: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
    }
    #video-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div id="video-container">
    <video id="video" controls autoplay playsinline webkit-playsinline ${isLive ? 'muted' : ''}></video>
  </div>
  
  <script>
    const video = document.getElementById('video');
    const videoSrc = '${streamUrl}';
    const extension = '${streamExtension}';
    const isHLS = ${isHLS};
    const isLive = ${isLive};
    
    console.log('🎬 Player init:', { videoSrc, extension, isHLS, isLive });
    
    // Pour HLS (m3u8, ts)
    if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
      console.log('✅ Using HLS.js');
      
      const hlsConfig = {
        debug: true,
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 30 : 90,
        maxBufferLength: isLive ? 10 : 30,
        maxMaxBufferLength: isLive ? 20 : 600,
        liveSyncDurationCount: isLive ? 3 : 2,
        liveMaxLatencyDurationCount: isLive ? 10 : Infinity,
        liveDurationInfinity: isLive,
        highBufferWatchdogPeriod: 2,
        xhrSetup: function(xhr, url) {
          xhr.withCredentials = false;
          // Headers pour contourner les blocages serveur
          xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          xhr.setRequestHeader('Accept', '*/*');
          xhr.setRequestHeader('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
          xhr.setRequestHeader('Origin', window.location.origin);
          xhr.setRequestHeader('Referer', '${streamUrl}');
        }
      };
      
      const hls = new Hls(hlsConfig);
      
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('✅ HLS manifest parsed');
        if (!isLive && ${startTime} > 0) {
          video.currentTime = ${startTime};
        }
        
        video.play().then(() => {
          console.log('✅ Video playing');
          if (isLive && video.muted) {
            // Unmute after autoplay
            setTimeout(() => {
              video.muted = false;
            }, 500);
          }
        }).catch(e => {
          console.log('⚠️ Autoplay prevented:', e);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'info',
              message: 'Tap to play'
            }));
          }
        });
      });
      
      hls.on(Hls.Events.ERROR, function(event, data) {
        console.error('❌ HLS error:', data.type, data.details);
        
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'hls_error',
            errorType: data.type,
            details: data.details
          }));
        }
        
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('💥 Fatal error, cannot recover');
              hls.destroy();
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  error: 'Fatal HLS error: ' + data.details
                }));
              }
              break;
          }
        }
      });
      
      hls.on(Hls.Events.FRAG_LOADED, function() {
        console.log('📦 Fragment loaded');
      });
      
    }
    // Support HLS natif (iOS)
    else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('✅ Using native HLS support');
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', function() {
        if (!isLive && ${startTime} > 0) {
          video.currentTime = ${startTime};
        }
        video.play().catch(e => console.log('⚠️ Autoplay prevented:', e));
      });
    }
    // Pour MP4, MKV, etc. (lecture directe)
    else {
      console.log('✅ Using direct video playback (MP4/MKV)');
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', function() {
        console.log('✅ Video metadata loaded, duration:', video.duration);
        video.currentTime = ${startTime};
        video.play().catch(e => console.log('⚠️ Autoplay prevented:', e));
      });
    }
    
    // Send playback updates
    video.addEventListener('timeupdate', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'timeupdate',
          currentTime: video.currentTime,
          duration: video.duration || 0
        }));
      }
    });
    
    // Video loaded
    video.addEventListener('loadeddata', function() {
      console.log('✅ Video loaded successfully');
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'loaded',
          duration: video.duration || 0
        }));
      }
    });
    
    // Playing event
    video.addEventListener('playing', function() {
      console.log('▶️ Video is playing');
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'playing'
        }));
      }
    });
    
    // Waiting event
    video.addEventListener('waiting', function() {
      console.log('⏳ Video is buffering');
    });
    
    // Handle errors
    video.addEventListener('error', function(e) {
      console.error('❌ Video error:', e, video.error);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: video.error ? video.error.message : 'Unknown error',
          code: video.error ? video.error.code : 0
        }));
      }
    });
  </script>
</body>
</html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'timeupdate') {
        setPlaybackTime(data.currentTime);
      } else if (data.type === 'error') {
        console.error('WebView error:', data.error, 'Code:', data.code);
        Alert.alert('❌ Erreur de lecture', `${data.error}\n\nCode: ${data.code || 'Unknown'}`);
      } else if (data.type === 'hls_error') {
        console.error('HLS error:', data.errorType, data.details);
        if (data.errorType === 'networkError') {
          Alert.alert('❌ Erreur réseau', 'Impossible de charger le flux. Vérifiez votre connexion.');
        } else if (data.errorType === 'mediaError') {
          Alert.alert('❌ Erreur média', 'Le format vidéo n\'est pas supporté.');
        }
      } else if (data.type === 'loaded') {
        console.log('✅ Video loaded, duration:', data.duration);
      } else if (data.type === 'playing') {
        console.log('▶️ Video is playing');
      } else if (data.type === 'info') {
        console.log('ℹ️', data.message);
      }
    } catch (error) {
      console.error('Error parsing webview message:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Chargement du flux...</Text>
      </View>
    );
  }

  if (!streamUrl) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={64} color="#E50914" />
        <Text style={styles.errorText}>Impossible de charger la vidéo</Text>
        <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden />
      
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <WebView
          ref={webViewRef}
          source={{ html: generatePlayerHTML() }}
          style={styles.webView}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onMessage={handleWebViewMessage}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingText}>Chargement de la vidéo...</Text>
            </View>
          )}
        />

        {showControls && (
          <View style={styles.controlsOverlay}>
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.rotateButton}
                  onPress={toggleOrientation}
                >
                  <Ionicons 
                    name={isLandscape ? "phone-portrait" : "phone-landscape"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.formatBadge}>{streamExtension.toUpperCase()}</Text>
              {streamType === 'movie' && playbackTime > 0 && (
                <Text style={styles.timeText}>
                  {Math.floor(playbackTime / 60)}:{String(Math.floor(playbackTime % 60)).padStart(2, '0')}
                </Text>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  backButtonError: {
    marginTop: 24,
    backgroundColor: '#E50914',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    paddingVertical: 20,
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rotateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  formatBadge: {
    backgroundColor: '#E50914',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
