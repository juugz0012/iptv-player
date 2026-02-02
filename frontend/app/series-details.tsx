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
import { xtreamAPI, watchlistAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface SeriesInfo {
  info: {
    name: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    cover?: string;
    backdrop_path?: string[];
  };
  seasons?: Array<{
    season_number: number;
    name: string;
    episode_count: number;
  }>;
  episodes?: {
    [season: string]: Array<{
      id: string;
      episode_num: number;
      title: string;
      container_extension: string;
      info?: {
        duration?: string;
        plot?: string;
      };
    }>;
  };
}

export default function SeriesDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { seriesId } = params;
  const { currentProfile, userCode } = useAuth();

  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  // Cache pour éviter de recharger à chaque visite
  const cacheRef = useRef<{[key: string]: {data: SeriesInfo, timestamp: number}}>({});
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  useEffect(() => {
    loadSeriesInfo();
    checkWatchlistStatus();
  }, [seriesId]);

  const loadSeriesInfo = async () => {
    try {
      setLoading(true);
      
      // Vérifier le cache
      const cached = cacheRef.current[seriesId as string];
      const now = Date.now();
      
      if (cached && (now - cached.timestamp < CACHE_DURATION)) {
        console.log('✅ Utilisation du cache série (âge: ' + Math.round((now - cached.timestamp) / 1000) + 's)');
        setSeriesInfo(cached.data);
        setLoading(false);
        return;
      }
      
      console.log('📥 Chargement des infos série...');
      const response = await xtreamAPI.getSeriesInfo(seriesId as string);
      setSeriesInfo(response.data);
      
      // Mettre en cache
      cacheRef.current[seriesId as string] = {
        data: response.data,
        timestamp: now
      };
    } catch (error) {
      console.error('Error loading series info:', error);
      Alert.alert('❌ Erreur', 'Impossible de charger les informations de la série');
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
        seriesId as string
      );
      setInWatchlist(response.data.in_watchlist);
    } catch (error) {
      console.error('Error checking watchlist:', error);
    }
  };

  const toggleWatchlist = async () => {
    if (!userCode || !currentProfile || !seriesInfo) return;
    
    setActionLoading(true);
    try {
      if (inWatchlist) {
        await watchlistAPI.removeFromWatchlist(
          userCode,
          currentProfile.name,
          seriesId as string
        );
        setInWatchlist(false);
        Alert.alert('✅', 'Retiré de Ma Liste Séries');
      } else {
        const seriesData = {
          series_id: seriesId,
          name: seriesInfo.info.name,
          cover: seriesInfo.info.cover,
          rating: seriesInfo.info.rating,
        };
        
        await watchlistAPI.addToWatchlist(
          userCode,
          currentProfile.name,
          seriesId as string,
          'series',
          seriesData
        );
        setInWatchlist(true);
        Alert.alert('✅', 'Ajouté à Ma Liste Séries');
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      Alert.alert('❌ Erreur', 'Impossible de modifier Ma Liste Séries');
    } finally {
      setActionLoading(false);
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

  if (!seriesInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Série introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const info = seriesInfo.info;
  const backdropUrl = info.backdrop_path?.[0] || info.cover || '';
  const totalSeasons = seriesInfo.seasons?.length || 0;

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
              <Ionicons name="tv" size={100} color="#444" />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(20,20,20,0.7)', '#141414']}
            style={styles.backdropGradient}
          />

          <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
            <View style={styles.backIconCircle}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.titleOverlay}>
            <Text style={styles.title}>{info.name}</Text>
            
            <View style={styles.mainMetadata}>
              {info.rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{String(parseFloat(info.rating).toFixed(1))}</Text>
                </View>
              )}
              {totalSeasons > 0 && (
                <Text style={styles.metadataText}>{totalSeasons} Saison{totalSeasons > 1 ? 's' : ''}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Contenu principal */}
        <View style={styles.contentContainer}>
          
          {/* Boutons d'action - Style Netflix */}
          <View style={styles.secondaryActionsContainer}>
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
                <Text style={styles.secondaryButtonText}>Ma Liste</Text>
              </View>
            </TouchableOpacity>
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

          {/* Saisons et Épisodes */}
          {seriesInfo.seasons && seriesInfo.seasons.length > 0 && (
            <View style={styles.episodesSection}>
              <Text style={styles.episodesTitle}>Saisons et Épisodes</Text>
              
              {/* Sélecteur de saisons */}
              <View style={styles.seasonsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {seriesInfo.seasons.map((season) => (
                    <TouchableOpacity
                      key={season.season_number}
                      style={[
                        styles.seasonChip,
                        selectedSeason === season.season_number && styles.seasonChipActive
                      ]}
                      onPress={() => setSelectedSeason(season.season_number)}
                    >
                      <LinearGradient
                        colors={selectedSeason === season.season_number 
                          ? ['#E50914', '#B20710'] 
                          : ['#2a2a2a', '#1f1f1f']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.seasonChipGradient}
                      >
                        <Text style={[
                          styles.seasonChipText,
                          selectedSeason === season.season_number && styles.seasonChipTextActive
                        ]}>
                          Saison {season.season_number}
                        </Text>
                        {season.episode_count && (
                          <Text style={styles.seasonEpisodeCount}>
                            {season.episode_count} épisode{season.episode_count > 1 ? 's' : ''}
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Liste des épisodes */}
              {seriesInfo.episodes && seriesInfo.episodes[selectedSeason.toString()] && (
                <View style={styles.episodesListContainer}>
                  {seriesInfo.episodes[selectedSeason.toString()].map((episode, index) => (
                    <TouchableOpacity
                      key={episode.id}
                      style={styles.episodeCard}
                      onPress={() => {
                        router.push({
                          pathname: '/player',
                          params: {
                            streamId: episode.id,
                            streamType: 'series',
                            title: `${info.name} - S${selectedSeason}E${episode.episode_num} - ${episode.title}`,
                            resumePosition: '0',
                          },
                        });
                      }}
                    >
                      <View style={styles.episodeThumbnail}>
                        <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.episodeNumber}>
                          {episode.episode_num}
                        </Text>
                      </View>
                      
                      <View style={styles.episodeInfo}>
                        <View style={styles.episodeHeader}>
                          <Text style={styles.episodeTitle} numberOfLines={1}>
                            {episode.episode_num}. {episode.title || `Épisode ${episode.episode_num}`}
                          </Text>
                          {episode.info?.duration && (
                            <Text style={styles.episodeDuration}>{episode.info.duration}</Text>
                          )}
                        </View>
                        {episode.info?.plot && (
                          <Text style={styles.episodePlot} numberOfLines={2}>
                            {episode.info.plot}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Message si pas d'épisodes pour cette saison */}
              {(!seriesInfo.episodes || !seriesInfo.episodes[selectedSeason.toString()]) && (
                <View style={styles.noEpisodesContainer}>
                  <Ionicons name="information-circle-outline" size={48} color="#666" />
                  <Text style={styles.noEpisodesText}>
                    Aucun épisode disponible pour cette saison
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Message si pas de saisons */}
          {(!seriesInfo.seasons || seriesInfo.seasons.length === 0) && (
            <View style={styles.episodesSection}>
              <Text style={styles.episodesTitle}>Saisons et Épisodes</Text>
              <View style={styles.noEpisodesContainer}>
                <Ionicons name="information-circle-outline" size={48} color="#666" />
                <Text style={styles.noEpisodesText}>
                  Informations non disponibles pour cette série
                </Text>
              </View>
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
  episodesSection: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  episodesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  seasonsContainer: {
    marginBottom: 20,
  },
  seasonChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#333',
    borderRadius: 20,
    marginRight: 12,
  },
  seasonChipActive: {
    backgroundColor: '#E50914',
  },
  seasonChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  seasonChipTextActive: {
    color: '#fff',
  },
  episodesListContainer: {
    gap: 12,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  episodeThumbnail: {
    width: 120,
    height: 70,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  episodeNumber: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  episodeTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  episodeDuration: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  episodePlot: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 18,
  },
  noEpisodesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noEpisodesText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
  },
});
