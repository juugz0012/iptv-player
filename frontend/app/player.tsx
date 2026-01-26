import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { xtreamAPI } from '../utils/api';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { streamId, streamType, title } = params;

  useEffect(() => {
    loadStream();
  }, []);

  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  const loadStream = async () => {
    try {
      setLoading(true);
      const response = await xtreamAPI.getStreamUrl(
        streamType as string,
        streamId as string
      );
      setStreamUrl(response.data.url);
    } catch (error) {
      console.error('Error loading stream:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Chargement du flux...</Text>
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
          source={{ uri: streamUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          paused={paused}
          controls={false}
          onError={(error) => {
            console.error('Video error:', error);
          }}
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

            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => setPaused(!paused)}
              >
                <Ionicons
                  name={paused ? 'play' : 'pause'}
                  size={64}
                  color="#fff"
                />
              </TouchableOpacity>
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
  videoContainer: {
    flex: 1,
  },
  video: {
    width: width,
    height: height,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
