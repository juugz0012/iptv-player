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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { xtreamAPI, progressAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import * as ScreenOrientation from 'expo-screen-orientation';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  
  const videoRef = useRef<Video>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { streamId, streamType, title, resumePosition } = params;
  const { currentProfile, userCode } = useAuth();

  useEffect(() => {
    // Lock to landscape for better viewing experience
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }

    loadStream();

    return () => {
      // Cleanup: unlock orientation and clear interval
      if (Platform.OS !== 'web') {
        ScreenOrientation.unlockAsync();
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
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

  // Save progress every 10 seconds
  useEffect(() => {
    if (duration > 0 && !paused && streamType === 'movie') {
      progressInterval.current = setInterval(() => {
        saveProgress();
      }, 10000);

      return () => {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [currentTime, duration, paused]);

  const loadStream = async () => {
    try {
      setLoading(true);
      
      // Build the stream URL according to Xtream Codes API format
      const response = await xtreamAPI.getStreamUrl(
        streamType as string,
        streamId as string
      );
      
      const url = response.data.url;
      console.log('Stream URL:', url);
      setStreamUrl(url);
      
      // If resume position is provided, seek to it after load
      if (resumePosition && parseFloat(resumePosition as string) > 0) {
        setTimeout(() => {
          seekToPosition(parseFloat(resumePosition as string) * 1000);
        }, 1500);
      }
    } catch (error) {
      console.error('Error loading stream:', error);
      Alert.alert(
        '❌ Erreur',
        'Impossible de charger le flux vidéo. Vérifiez votre connexion.',
        [{ text: 'Retour', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    if (!userCode || !currentProfile || streamType !== 'movie') return;
    
    try {
      await progressAPI.updateProgress(
        userCode,
        currentProfile.name,
        streamId as string,
        streamType as string,
        Math.floor(currentTime / 1000),
        Math.floor(duration / 1000)
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const seekToPosition = async (positionMillis: number) => {
    try {
      if (videoRef.current) {
        await videoRef.current.setPositionAsync(positionMillis);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
        Alert.alert('❌ Erreur de lecture', 'Impossible de lire cette vidéo.');
      }
      return;
    }

    setCurrentTime(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setBuffering(status.isBuffering || false);
    
    // Auto-save when video ends
    if (status.didJustFinish && streamType === 'movie') {
      saveProgress();
    }
  };

  const togglePlayPause = async () => {
    try {
      if (videoRef.current) {
        if (paused) {
          await videoRef.current.playAsync();
        } else {
          await videoRef.current.pauseAsync();
        }
        setPaused(!paused);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleBack = async () => {
    // Save progress before leaving
    if (streamType === 'movie') {
      await saveProgress();
    }
    router.back();
  };

  const skipForward = async () => {
    if (videoRef.current && currentTime + 10000 < duration) {
      await videoRef.current.setPositionAsync(currentTime + 10000);
    }
  };

  const skipBackward = async () => {
    if (videoRef.current && currentTime - 10000 > 0) {
      await videoRef.current.setPositionAsync(currentTime - 10000);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={!paused}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
        />

        {buffering && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.bufferingText}>Mise en mémoire tampon...</Text>
          </View>
        )}

        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Top bar with back button and title */}
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

            {/* Center controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={skipBackward}
              >
                <Ionicons name="play-back" size={48} color="#fff" />
                <Text style={styles.skipText}>-10s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
              >
                <Ionicons
                  name={paused ? 'play' : 'pause'}
                  size={72}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={skipForward}
              >
                <Ionicons name="play-forward" size={48} color="#fff" />
                <Text style={styles.skipText}>+10s</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom bar with progress */}
            {streamType === 'movie' && duration > 0 && (
              <View style={styles.bottomBar}>
                <Text style={styles.timeText}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill,
                        { width: `${(currentTime / duration) * 100}%` }
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
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
  video: {
    width: '100%',
    height: '100%',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(229,9,20,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
});
