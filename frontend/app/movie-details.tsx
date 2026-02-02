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
import { LinearGradient } from 'expo-linear-gradient';
import { xtreamAPI, watchlistAPI, progressAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface MovieInfo {
  info: {
    name: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releasedate?: string;
    release_date?: string;
    rating?: string;
    duration?: string;
    runtime?: string;
    backdrop_path?: string[];
    movie_image?: string;
    tmdb_id?: string;
    youtube_trailer?: string;
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
  const { currentProfile, userCode } = useAuth();

  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchProgress, setWatchProgress] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadMovieInfo();
    checkWatchlistStatus();
    checkWatchProgress();
  }, []);

  const loadMovieInfo = async () => {
    try {
      setLoading(true);
      const response = await xtreamAPI.getVodInfo(streamId as string);
      setMovieInfo(response.data);
    } catch (error) {
      console.error('Error loading movie info:', error);
      Alert.alert('❌ Erreur', 'Impossible de charger les informations du film');
    } finally {
      setLoading(false);
    }
  };

  const checkWatchlistStatus = async () => {
    if (!userCode || !currentProfile) return;
    
    try {
      const response = await watchlistAPI.checkWatchlist(
        userCode,
        currentProfile.name,
        streamId as string
      );
      setInWatchlist(response.data.in_watchlist);
    } catch (error) {
      console.error('Error checking watchlist:', error);
    }
  };

  const checkWatchProgress = async () => {
    if (!userCode || !currentProfile) return;
    
    try {
      const response = await progressAPI.getProgress(
        userCode,
        currentProfile.name,
        streamId as string
      );
      
      if (response.data.has_progress) {
        setWatchProgress(response.data);
      }
    } catch (error) {
      console.error('Error checking progress:', error);
    }
  };

  const toggleWatchlist = async () => {
    if (!userCode || !currentProfile || !movieInfo) return;
    
    setActionLoading(true);
    try {
      if (inWatchlist) {
        await watchlistAPI.removeFromWatchlist(
          userCode,
          currentProfile.name,
          streamId as string
        );
        setInWatchlist(false);
        Alert.alert('✅', 'Retiré de Ma liste');
      } else {
        const movieData = {
          stream_id: streamId,
          name: movieInfo.info.name,
          stream_icon: movieInfo.info.movie_image,
          rating: movieInfo.info.rating,
        };
        
        await watchlistAPI.addToWatchlist(
          userCode,
          currentProfile.name,
          streamId as string,
          'movie',
          movieData
        );
        setInWatchlist(true);
        Alert.alert('✅', 'Ajouté à Ma liste');
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      Alert.alert('❌ Erreur', 'Impossible de modifier Ma liste');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlay = (resume: boolean = false) => {
    const startTime = resume && watchProgress ? watchProgress.current_time : 0;
    
    router.push({
      pathname: '/player',
      params: {
        streamId: streamId as string,
        streamType: 'movie',
        title: movieInfo?.info.name || 'Film',
        resumePosition: startTime.toString(),
      },
    });
  };

  const openTrailer = () => {
    if (movieInfo?.info.youtube_trailer) {
      Alert.alert('🎬 Bande-annonce', 'Ouverture de la bande-annonce...');
      // TODO: Implémenter l'ouverture de la vidéo YouTube
    } else {
      Alert.alert('😔', 'Aucune bande-annonce disponible');
    }
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
  const backdropUrl = info.backdrop_path?.[0] || info.movie_image || '';
  const releaseYear = info.releasedate || info.release_date || '';
  const duration = info.duration || info.runtime || '';
  const hasProgress = watchProgress && watchProgress.percentage > 5 && watchProgress.percentage < 95;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header avec image de fond Netflix style */}
        <View style={styles.headerContainer}>
          {backdropUrl ? (
            <Image
              source={{ uri: backdropUrl }}
              style={styles.backdrop}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.backdrop, styles.backdropPlaceholder]}>
              <Ionicons name="film" size={100} color="#444" />
            </View>
          )}
          
          {/* Gradient overlay pour effet Netflix */}
          <LinearGradient
            colors={['transparent', 'rgba(20,20,20,0.7)', '#141414']}
            style={styles.backdropGradient}
          />

          {/* Bouton retour */}
          <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
            <View style={styles.backIconCircle}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Titre et info au-dessus de l'image */}
          <View style={styles.titleOverlay}>
            <Text style={styles.title}>{info.name}</Text>
            
            {/* Métadonnées principales */}
            <View style={styles.mainMetadata}>
              {info.rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{String(parseFloat(info.rating).toFixed(1))}</Text>
                </View>
              )}
              {releaseYear && (
                <Text style={styles.metadataText}>{releaseYear.substring(0, 4)}</Text>
              )}
              {duration && (
                <Text style={styles.metadataText}>{duration}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Contenu principal */}
        <View style={styles.contentContainer}>
          
          {/* Boutons d'action principaux - Style Netflix */}
          <View style={styles.primaryActionsContainer}>
            {hasProgress ? (
              <>
                {/* Bouton Reprendre */}
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => handlePlay(true)}
                >
                  <Ionicons name="play" size={28} color="#000" />
                  <Text style={styles.playButtonText}>
                    Reprendre
                  </Text>
                </TouchableOpacity>
                
                {/* Progression visuelle */}
                <View style={styles.progressIndicator}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${watchProgress.percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(watchProgress.percentage)}% regardé
                  </Text>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => handlePlay(false)}
              >
                <Ionicons name="play" size={28} color="#000" />
                <Text style={styles.playButtonText}>Regarder</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Boutons secondaires */}
          <View style={styles.secondaryActionsContainer}>
            {/* Regarder plus tard */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={toggleWatchlist}
              disabled={actionLoading}
            >
              <View style={styles.secondaryButtonContent}>
                <Ionicons
                  name={inWatchlist ? 'checkmark-circle' : 'add-circle-outline'}
                  size={32}
                  color={inWatchlist ? '#00AA13' : '#fff'}
                />
                <Text style={styles.secondaryButtonText}>Ma liste</Text>
              </View>
            </TouchableOpacity>

            {/* Regarder depuis le début (si en cours) */}
            {hasProgress && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handlePlay(false)}
              >
                <View style={styles.secondaryButtonContent}>
                  <Ionicons name="refresh-circle-outline" size={32} color="#fff" />
                  <Text style={styles.secondaryButtonText}>Recommencer</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Bande annonce */}
            {info.youtube_trailer && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={openTrailer}
              >
                <View style={styles.secondaryButtonContent}>
                  <Ionicons name="play-circle-outline" size={32} color="#fff" />
                  <Text style={styles.secondaryButtonText}>Bande-annonce</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Synopsis */}
          {info.plot && (
            <View style={styles.section}>
              <Text style={styles.plotText}>{info.plot}</Text>
            </View>
          )}

          {/* Genre tags */}
          {info.genre && (
            <View style={styles.genreContainer}>
              {info.genre.split(',').slice(0, 4).map((genre, index) => (
                <View key={index} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Informations supplémentaires */}
          <View style={styles.infoSection}>
            {info.director && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Réalisateur :</Text>
                <Text style={styles.infoValue}>{info.director}</Text>
              </View>
            )}
            
            {info.cast && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Casting :</Text>
                <Text style={styles.infoValue}>{info.cast}</Text>
              </View>
            )}
          </View>
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
    height: height * 0.6,
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
    height: '70%',
  },
  backIconButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  backIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mainMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  metadataText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 0,
  },
  primaryActionsContainer: {
    marginBottom: 24,
  },
  playButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 12,
  },
  playButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressIndicator: {
    marginTop: 12,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  secondaryActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  secondaryButton: {
    alignItems: 'center',
  },
  secondaryButtonContent: {
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  plotText: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 24,
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
    borderRadius: 20,
  },
  genreText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
});
