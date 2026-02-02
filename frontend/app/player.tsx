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
import { xtreamAPI, progressAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  const webViewRef = useRef<WebView>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { streamId, streamType, title, resumePosition } = params;
  const { currentProfile, userCode } = useAuth();

  useEffect(() => {
    loadStream();

    // Handle Android back button
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
      
      const response = await xtreamAPI.getStreamUrl(
        streamType as string,
        streamId as string
      );
      
      const url = response.data.url;
      console.log('Stream URL:', url);
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
        7200 // Durée estimée de 2h par défaut
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleBack = async () => {
    if (streamType === 'movie') {
      await saveProgress();
    }
    router.back();
  };

  // HTML player with HLS.js for better compatibility
  const generatePlayerHTML = () => {
    const startTime = resumePosition ? parseFloat(resumePosition as string) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
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
    <video id="video" controls autoplay playsinline webkit-playsinline></video>
  </div>
  
  <script>
    const video = document.getElementById('video');
    const videoSrc = '${streamUrl}';
    
    // Initialize HLS.js if supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
      });
      
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('HLS manifest parsed');
        video.currentTime = ${startTime};
        video.play().catch(e => console.log('Autoplay prevented:', e));
      });
      
      hls.on(Hls.Events.ERROR, function(event, data) {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });
    }
    // Fallback for native HLS support (iOS)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', function() {
        video.currentTime = ${startTime};
        video.play().catch(e => console.log('Autoplay prevented:', e));
      });
    }
    
    // Send playback updates
    video.addEventListener('timeupdate', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'timeupdate',
          currentTime: video.currentTime,
          duration: video.duration
        }));
      }
    });
    
    // Handle errors
    video.addEventListener('error', function(e) {
      console.error('Video error:', e);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: 'Video playback error'
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
        Alert.alert('❌ Erreur', 'Erreur de lecture vidéo');
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
            </View>

            <View style={styles.infoContainer}>
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
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    padding: 16,
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
