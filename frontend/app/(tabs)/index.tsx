import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { xtreamAPI, watchlistAPI } from '../../utils/api';
import axios from 'axios';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = 120;
const POSTER_HEIGHT = 180;

interface WatchlistItem {
  stream_id: string;
  stream_type: string;
  movie_data: {
    name: string;
    stream_icon?: string;
    rating?: string;
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { currentProfile, userCode } = useAuth();
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [progress, setProgress] = useState(0);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [seriesWatchlist, setSeriesWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Recharger la watchlist quand l'utilisateur revient sur cet onglet
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Page Accueil focalisée - Rechargement watchlist');
      loadWatchlist();
    }, [userCode, currentProfile])
  );

  const loadWatchlist = async () => {
    if (!userCode || !currentProfile) {
      console.log('❌ No userCode or currentProfile');
      setLoadingWatchlist(false);
      return;
    }
    
    try {
      setLoadingWatchlist(true);
      console.log('📥 Loading watchlist for:', userCode, currentProfile.name);
      const response = await watchlistAPI.getWatchlist(userCode, currentProfile.name);
      const allItems = response.data || [];
      
      // Séparer films et séries
      const movies = allItems.filter((item: any) => item.stream_type !== 'series');
      const series = allItems.filter((item: any) => item.stream_type === 'series');
      
      console.log('✅ Watchlist loaded:', movies.length, 'films,', series.length, 'séries');
      setWatchlist(movies);
      setSeriesWatchlist(series);
    } catch (error) {
      console.error('❌ Error loading watchlist:', error);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const categories = [
    {
      title: 'TV en Direct',
      icon: 'tv',
      route: '/(tabs)/live',
      color: '#E50914',
    },
    {
      title: 'Films',
      icon: 'film',
      route: '/(tabs)/movies',
      color: '#0071EB',
    },
    {
      title: 'Séries',
      icon: 'list',
      route: '/(tabs)/series',
      color: '#5500D9',
    },
  ];

  const handleLoadPlaylist = async () => {
    try {
      setLoadingPlaylist(true);
      setProgress(0);

      // Étape 1: Charger les catégories Live (20%)
      setProgress(20);
      const liveCategories = await xtreamAPI.getLiveCategories();

      // Étape 2: Charger les catégories VOD (40%)
      setProgress(40);
      const vodCategories = await xtreamAPI.getVodCategories();

      // Étape 3: Charger les catégories Séries (60%)
      setProgress(60);
      const seriesCategories = await xtreamAPI.getSeriesCategories();

      // Étape 4: Charger les streams Live (80%)
      setProgress(80);
      const liveStreams = await xtreamAPI.getLiveStreams();

      // Étape 5: Charger les streams VOD (90%)
      setProgress(90);
      const vodStreams = await xtreamAPI.getVodStreams();

      // Étape 6: Charger les séries (100%)
      setProgress(100);
      const series = await xtreamAPI.getSeriesStreams();

      // Résumé
      const totalLive = liveStreams.data?.length || 0;
      const totalVod = vodStreams.data?.length || 0;
      const totalSeries = series.data?.length || 0;
      const totalCategories = (liveCategories.data?.length || 0) + (vodCategories.data?.length || 0) + (seriesCategories.data?.length || 0);

      Alert.alert(
        '✅ Playlist chargée !',
        `📊 Résumé :\n\n📺 Chaînes Live : ${totalLive}\n🎬 Films : ${totalVod}\n📺 Séries : ${totalSeries}\n📁 Catégories : ${totalCategories}`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error loading playlist:', error);
      Alert.alert('❌ Erreur', 'Impossible de charger la playlist');
    } finally {
      setLoadingPlaylist(false);
      setProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.logo}>IPTV Player</Text>
        <View style={styles.profileInfo}>
          <Ionicons
            name={currentProfile?.is_child ? 'happy' : 'person-circle'}
            size={32}
            color="#E50914"
          />
          <Text style={styles.profileName}>{currentProfile?.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Bienvenue sur IPTV Player</Text>
          <Text style={styles.heroSubtitle}>
            Profitez de milliers de chaînes, films et séries
          </Text>
        </View>

        {/* Bouton Charger Playlist */}
        <View style={styles.loadPlaylistSection}>
          <TouchableOpacity
            style={styles.loadPlaylistButton}
            onPress={handleLoadPlaylist}
            disabled={loadingPlaylist}
          >
            {loadingPlaylist ? (
              <View style={styles.loadingContainer}>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.loadingText}>Chargement... {progress}%</Text>
              </View>
            ) : (
              <>
                <Ionicons name="refresh-circle" size={28} color="#fff" />
                <Text style={styles.loadPlaylistButtonText}>Charger / Rafraîchir la Playlist</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section "Ma liste" - Style Netflix */}
        {!loadingWatchlist && watchlist.length > 0 && (
          <View style={styles.watchlistSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bookmark" size={24} color="#E50914" />
              <Text style={styles.sectionTitle}>Ma liste</Text>
            </View>
            
            <FlatList
              horizontal
              data={watchlist}
              keyExtractor={(item) => item.stream_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.watchlistItem}
                  onPress={() => router.push({
                    pathname: '/movie-details',
                    params: {
                      streamId: item.stream_id,
                      streamType: item.stream_type,
                    },
                  })}
                >
                  {item.movie_data.stream_icon ? (
                    <Image
                      source={{ uri: item.movie_data.stream_icon }}
                      style={styles.watchlistPoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.watchlistPoster, styles.watchlistPosterPlaceholder]}>
                      <Ionicons name="film" size={32} color="#666" />
                    </View>
                  )}
                  <Text style={styles.watchlistTitle} numberOfLines={2}>
                    {item.movie_data.name}
                  </Text>
                  {item.movie_data.rating && (
                    <View style={styles.watchlistRating}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.watchlistRatingText}>
                        {String(parseFloat(item.movie_data.rating).toFixed(1))}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.watchlistContent}
            />
          </View>
        )}

        {/* Section "Ma Liste Séries" - Style Netflix */}
        {!loadingWatchlist && seriesWatchlist.length > 0 && (
          <View style={styles.watchlistSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="tv" size={24} color="#E50914" />
              <Text style={styles.sectionTitle}>Ma Liste Séries</Text>
            </View>
            
            <FlatList
              horizontal
              data={seriesWatchlist}
              keyExtractor={(item) => item.stream_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.watchlistItem}
                  onPress={() => router.push({
                    pathname: '/series-details',
                    params: {
                      seriesId: item.stream_id,
                    },
                  })}
                >
                  {item.movie_data.cover || item.movie_data.stream_icon ? (
                    <Image
                      source={{ uri: item.movie_data.cover || item.movie_data.stream_icon }}
                      style={styles.watchlistPoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.watchlistPoster, styles.watchlistPosterPlaceholder]}>
                      <Ionicons name="tv" size={32} color="#666" />
                    </View>
                  )}
                  <Text style={styles.watchlistTitle} numberOfLines={2}>
                    {item.movie_data.name}
                  </Text>
                  {item.movie_data.rating && (
                    <View style={styles.watchlistRating}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.watchlistRatingText}>
                        {String(parseFloat(item.movie_data.rating).toFixed(1))}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.watchlistContent}
            />
          </View>
        )}

        <View style={styles.categoriesContainer}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.categoryCard, { backgroundColor: category.color }]}
              onPress={() => router.push(category.route as any)}
            >
              <Ionicons name={category.icon as any} size={48} color="#fff" />
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Fonctionnalités</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00AA13" />
              <Text style={styles.featureText}>Chaînes TV en direct avec EPG</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00AA13" />
              <Text style={styles.featureText}>Bibliothèque de films et séries</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00AA13" />
              <Text style={styles.featureText}>Contrôle parental</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00AA13" />
              <Text style={styles.featureText}>Multi-profils</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00AA13" />
              <Text style={styles.featureText}>Compatible TV et mobile</Text>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E50914',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  hero: {
    padding: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  categoriesContainer: {
    padding: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
  },
  infoSection: {
    padding: 16,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featuresList: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  loadPlaylistSection: {
    padding: 16,
    marginBottom: 24,
  },
  loadPlaylistButton: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  loadPlaylistButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#33001a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  watchlistSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  watchlistContent: {
    paddingHorizontal: 16,
  },
  watchlistItem: {
    width: POSTER_WIDTH,
    marginRight: 12,
  },
  watchlistPoster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  watchlistPosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchlistTitle: {
    fontSize: 13,
    color: '#fff',
    marginTop: 8,
    fontWeight: '600',
  },
  watchlistRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  watchlistRatingText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '600',
  },
});
