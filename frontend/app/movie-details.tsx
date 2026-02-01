import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { xtreamAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface MovieInfo {
  info: {
    name: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releasedate?: string;
    rating?: string;
    duration?: string;
    backdrop_path?: string[];
    movie_image?: string;
    tmdb_id?: string;
  };
  movie_data: {
    stream_id: number;
    name: string;
    container_extension: string;
  };
}

export default function MovieDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { streamId, streamType } = params;

  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);

  useEffect(() => {
    loadMovieInfo();
    checkFavoriteStatus();
    checkResumeTime();
  }, []);

  const loadMovieInfo = async () => {
    try {
      setLoading(true);
      const response = await xtreamAPI.getVodInfo(streamId as string);
      setMovieInfo(response.data);
    } catch (error) {
      console.error('Error loading movie info:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations du film');
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorites_movies');
      if (favorites) {
        const favArray = JSON.parse(favorites);
        setIsFavorite(favArray.includes(streamId));
      }
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const checkResumeTime = async () => {
    try {
      const resumeData = await AsyncStorage.getItem(`resume_movie_${streamId}`);
      if (resumeData) {
        const data = JSON.parse(resumeData);
        setResumeTime(data.position || 0);
      }
    } catch (error) {
      console.error('Error checking resume time:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorites_movies');
      let favArray: string[] = favorites ? JSON.parse(favorites) : [];

      if (isFavorite) {
        // Retirer des favoris
        favArray = favArray.filter(id => id !== streamId);
        Alert.alert('✅ Retiré', 'Film retiré des favoris');
      } else {
        // Ajouter aux favoris
        favArray.push(streamId as string);
        Alert.alert('✅ Ajouté', 'Film ajouté aux favoris');
      }

      await AsyncStorage.setItem('favorites_movies', JSON.stringify(favArray));
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handlePlay = (resume: boolean = false) => {
    router.push({
      pathname: '/player',
      params: {
        streamId: streamId as string,
        streamType: 'movie',
        title: movieInfo?.info.name || 'Film',
        resumePosition: resume ? resumeTime.toString() : '0',
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!movieInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Film introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const info = movieInfo.info;
  const posterUrl = info.movie_image || info.backdrop_path?.[0] || '';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scrollView}>
        {/* Header avec image de fond */}
        <View style={styles.headerContainer}>
          {posterUrl ? (
            <>
              <Image
                source={{ uri: posterUrl }}
                style={styles.backdrop}
                resizeMode="cover"
              />
              <View style={styles.backdropGradient} />
            </>
          ) : (
            <View style={[styles.backdrop, styles.backdropPlaceholder]}>
              <Ionicons name="film" size={80} color="#666" />
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Informations du film */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{info.name}</Text>

          {/* Métadonnées */}
          <View style={styles.metadataContainer}>
            {info.rating && (
              <View style={styles.metadataItem}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.metadataText}>{info.rating}/10</Text>
              </View>
            )}
            {info.releasedate && (
              <View style={styles.metadataItem}>
                <Ionicons name="calendar" size={16} color="#888" />
                <Text style={styles.metadataText}>{info.releasedate}</Text>
              </View>
            )}
            {info.duration && (
              <View style={styles.metadataItem}>
                <Ionicons name="time" size={16} color="#888" />
                <Text style={styles.metadataText}>{info.duration}</Text>
              </View>
            )}
          </View>

          {/* Genre */}
          {info.genre && (
            <View style={styles.genreContainer}>
              {info.genre.split(',').map((genre, index) => (
                <View key={index} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Boutons d'action */}
          <View style={styles.actionsContainer}>
            {resumeTime > 0 ? (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => handlePlay(true)}
              >
                <Ionicons name="play-skip-forward" size={24} color="#fff" />
                <Text style={styles.playButtonText}>Reprendre</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => handlePlay(false)}
              >
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.playButtonText}>Lire</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={toggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? '#E50914' : '#fff'}
              />
              <Text style={styles.favoriteButtonText}>
                {isFavorite ? 'Favoris' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
          </View>

          {resumeTime > 0 && (
            <TouchableOpacity
              style={styles.restartButton}
              onPress={() => handlePlay(false)}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.restartButtonText}>Regarder depuis le début</Text>
            </TouchableOpacity>
          )}

          {/* Synopsis */}
          {info.plot && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Synopsis</Text>
              <Text style={styles.plotText}>{info.plot}</Text>
            </View>
          )}

          {/* Réalisateur */}
          {info.director && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Réalisateur</Text>
              <Text style={styles.sectionText}>{info.director}</Text>
            </View>
          )}

          {/* Casting */}
          {info.cast && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Casting</Text>
              <Text style={styles.sectionText}>{info.cast}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#E50914',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    height: height * 0.5,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropPlaceholder: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to bottom, transparent, #141414)',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 14,
    color: '#ccc',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  genreChip: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 14,
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E50914',
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  favoriteButton: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restartButton: {
    flexDirection: 'row',
    backgroundColor: '#222',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  plotText: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  sectionText: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
});
