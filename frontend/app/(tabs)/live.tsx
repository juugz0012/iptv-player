import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { xtreamAPI, watchlistAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import TVFocusable from '../../components/TVFocusable';
import LoadingScreen from '../../components/LoadingScreen';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Platform.isTV ? 280 : 160;
const CARD_HEIGHT = Platform.isTV ? 180 : 120;

interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

interface Stream {
  stream_id: number;
  num: number;
  name: string;
  stream_type: string;
  stream_icon?: string;
  epg_channel_id?: string;
  added?: string;
  category_id: string;
}

interface GroupedChannel {
  baseName: string;
  streams: Stream[];
  stream_icon?: string;
}

interface WatchlistItem {
  stream_id: string;
  stream_type: string;
  movie_data: any;
}

export default function LiveTVScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<WatchlistItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  
  const router = useRouter();
  const { currentProfile, userCode } = useAuth();
  const streamsCache = useRef<Stream[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  useEffect(() => {
    if (searchQuery) {
      const filtered = streams.filter(stream =>
        stream.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStreams(filtered);
    } else {
      setFilteredStreams(streams);
    }
  }, [searchQuery, streams]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadFavorites()]);
    await loadStreams();
    setLoading(false);
  };

  const loadFavorites = async () => {
    if (!userCode || !currentProfile) return;
    
    try {
      setLoadingFavorites(true);
      const response = await watchlistAPI.getWatchlist(userCode, currentProfile.name);
      // Filter only live_tv items
      const tvFavorites = response.data.filter((item: WatchlistItem) => item.stream_type === 'live_tv');
      setFavorites(tvFavorites);
      console.log('📺 Favorites TV loaded:', tvFavorites.length);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await xtreamAPI.getLiveCategories();
      setCategories(response.data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de charger les catégories'
      );
    }
  };

  const loadStreams = async (categoryId?: string) => {
    // Use cache if already loaded
    if (streamsCache.current.length > 0 && !categoryId) {
      setStreams(streamsCache.current);
      setFilteredStreams(streamsCache.current);
      return;
    }

    try {
      setLoadingStreams(true);
      console.log('🔍 Tentative de chargement des chaînes...');
      
      const response = await xtreamAPI.getLiveStreams(categoryId);
      const loadedStreams = response.data || [];
      
      console.log('✅ Succès! Nombre de chaînes:', loadedStreams.length);
      
      if (!categoryId) {
        streamsCache.current = loadedStreams;
      }
      
      setStreams(loadedStreams);
      setFilteredStreams(loadedStreams);
    } catch (error: any) {
      console.error('❌ Error loading streams:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de charger les chaînes'
      );
    } finally {
      setLoadingStreams(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
    loadStreams(categoryId);
  };

  const handlePlayStream = (stream: Stream) => {
    router.push({
      pathname: '/player',
      params: {
        streamId: stream.stream_id,
        streamType: 'live',
        streamName: stream.name,
      },
    });
  };

  const isFavorite = (streamId: number): boolean => {
    return favorites.some(fav => fav.stream_id === streamId.toString());
  };

  const toggleFavorite = async (stream: Stream) => {
    if (!userCode || !currentProfile) return;

    try {
      if (isFavorite(stream.stream_id)) {
        // Remove from favorites
        await watchlistAPI.removeFromWatchlist(userCode, currentProfile.name, stream.stream_id.toString());
        Alert.alert('✅', 'Retiré de Ma Liste TV');
      } else {
        // Add to favorites
        await watchlistAPI.addToWatchlist({
          user_code: userCode,
          profile_name: currentProfile.name,
          stream_id: stream.stream_id.toString(),
          stream_type: 'live_tv',
          movie_data: {
            name: stream.name,
            stream_icon: stream.stream_icon,
            num: stream.num,
            category_id: stream.category_id,
          },
        });
        Alert.alert('✅', 'Ajouté à Ma Liste TV');
      }
      await loadFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const renderChannelCard = ({ item }: { item: Stream | WatchlistItem }) => {
    const stream = 'stream_id' in item ? item : null;
    const favorite = 'movie_data' in item ? item : null;
    
    const streamId = stream ? stream.stream_id : parseInt(favorite!.stream_id);
    const streamName = stream ? stream.name : favorite!.movie_data.name;
    const streamIcon = stream ? stream.stream_icon : favorite!.movie_data.stream_icon;
    const streamData = stream || {
      stream_id: parseInt(favorite!.stream_id),
      name: favorite!.movie_data.name,
      stream_icon: favorite!.movie_data.stream_icon,
      num: favorite!.movie_data.num,
      category_id: favorite!.movie_data.category_id,
      stream_type: 'live',
    } as Stream;

    return (
      <View style={styles.channelCardContainer}>
        <TVFocusable
          style={styles.channelCard}
          onPress={() => handlePlayStream(streamData)}
        >
          {/* Logo de la chaîne */}
          {streamIcon ? (
            <Image
              source={{ uri: streamIcon }}
              style={styles.channelLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.channelLogoPlaceholder}>
              <Ionicons
                name="tv"
                size={Platform.isTV ? 60 : 40}
                color="#666"
              />
            </View>
          )}

          {/* Nom de la chaîne */}
          <View style={styles.channelInfo}>
            <Text style={styles.channelName} numberOfLines={2}>
              {streamName}
            </Text>
          </View>

          {/* Badge Live */}
          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </TVFocusable>

        {/* Bouton Favori */}
        <TVFocusable
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(streamData)}
        >
          <Ionicons
            name={isFavorite(streamId) ? 'heart' : 'heart-outline'}
            size={Platform.isTV ? 28 : 20}
            color={isFavorite(streamId) ? '#E50914' : '#fff'}
          />
        </TVFocusable>
      </View>
    );
  };

  if (loading) {
    return <LoadingScreen message="Chargement des chaînes TV..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TV en Direct</Text>
        <View style={styles.headerStats}>
          <Ionicons name="tv" size={Platform.isTV ? 28 : 20} color="#E50914" />
          <Text style={styles.headerStatsText}>
            {filteredStreams.length} chaînes
          </Text>
        </View>
      </View>

      {/* Tabs: Toutes / Ma Liste TV */}
      <View style={styles.tabsContainer}>
        <TVFocusable
          style={[
            styles.tab,
            activeTab === 'all' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('all')}
          hasTVPreferredFocus={true}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'all' && styles.tabTextActive,
          ]}>
            Toutes les chaînes
          </Text>
        </TVFocusable>

        <TVFocusable
          style={[
            styles.tab,
            activeTab === 'favorites' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons
            name="heart"
            size={Platform.isTV ? 24 : 18}
            color={activeTab === 'favorites' ? '#E50914' : '#666'}
            style={{ marginRight: 8 }}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'favorites' && styles.tabTextActive,
          ]}>
            Ma Liste TV ({favorites.length})
          </Text>
        </TVFocusable>
      </View>

      {activeTab === 'all' ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={Platform.isTV ? 28 : 20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une chaîne..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TVFocusable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={Platform.isTV ? 28 : 20} color="#666" />
              </TVFocusable>
            )}
          </View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.category_id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TVFocusable
                  style={[
                    styles.categoryChip,
                    selectedCategory === item.category_id && styles.categoryChipActive,
                  ]}
                  onPress={() => handleCategorySelect(item.category_id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === item.category_id && styles.categoryChipTextActive,
                    ]}
                  >
                    {item.category_name}
                  </Text>
                </TVFocusable>
              )}
            />
          </View>

          {/* Channels Grid */}
          {loadingStreams ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredStreams}
              keyExtractor={(item) => item.stream_id.toString()}
              renderItem={renderChannelCard}
              numColumns={Platform.isTV ? 4 : 2}
              contentContainerStyle={styles.channelsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : (
        /* Ma Liste TV */
        <View style={styles.favoritesContainer}>
          {loadingFavorites ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          ) : favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={Platform.isTV ? 100 : 60} color="#333" />
              <Text style={styles.emptyText}>Aucune chaîne favorite</Text>
              <Text style={styles.emptySubtext}>
                Ajoutez vos chaînes préférées en appuyant sur ❤️
              </Text>
            </View>
          ) : (
            <FlatList
              data={favorites}
              keyExtractor={(item) => item.stream_id}
              renderItem={renderChannelCard}
              numColumns={Platform.isTV ? 4 : 2}
              contentContainerStyle={styles.channelsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
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
    padding: Platform.isTV ? 30 : 20,
    paddingTop: Platform.isTV ? 40 : 30,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: Platform.isTV ? 36 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.isTV ? 12 : 8,
  },
  headerStatsText: {
    fontSize: Platform.isTV ? 20 : 14,
    color: '#ccc',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: Platform.isTV ? 20 : 15,
    gap: Platform.isTV ? 15 : 10,
    backgroundColor: '#1a1a1a',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.isTV ? 15 : 10,
    paddingHorizontal: Platform.isTV ? 25 : 20,
    borderRadius: 25,
    backgroundColor: '#252525',
  },
  tabActive: {
    backgroundColor: '#E50914',
  },
  tabText: {
    fontSize: Platform.isTV ? 20 : 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Platform.isTV ? 20 : 15,
    marginBottom: Platform.isTV ? 15 : 10,
    paddingHorizontal: Platform.isTV ? 20 : 15,
    paddingVertical: Platform.isTV ? 15 : 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    marginLeft: Platform.isTV ? 15 : 10,
    fontSize: Platform.isTV ? 20 : 16,
    color: '#fff',
  },
  clearButton: {
    padding: Platform.isTV ? 8 : 5,
  },
  categoriesContainer: {
    paddingHorizontal: Platform.isTV ? 20 : 15,
    marginBottom: Platform.isTV ? 20 : 15,
  },
  categoryChip: {
    paddingVertical: Platform.isTV ? 12 : 8,
    paddingHorizontal: Platform.isTV ? 20 : 15,
    marginRight: Platform.isTV ? 12 : 8,
    backgroundColor: '#252525',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  categoryChipText: {
    fontSize: Platform.isTV ? 18 : 14,
    color: '#ccc',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Platform.isTV ? 20 : 15,
    fontSize: Platform.isTV ? 20 : 16,
    color: '#ccc',
  },
  channelsList: {
    padding: Platform.isTV ? 15 : 10,
    paddingBottom: Platform.isTV ? 100 : 80,
  },
  channelCardContainer: {
    width: CARD_WIDTH + (Platform.isTV ? 20 : 10),
    margin: Platform.isTV ? 10 : 5,
  },
  channelCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  channelLogo: {
    width: '100%',
    height: '70%',
    backgroundColor: '#252525',
  },
  channelLogoPlaceholder: {
    width: '100%',
    height: '70%',
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    flex: 1,
    padding: Platform.isTV ? 12 : 8,
    justifyContent: 'center',
  },
  channelName: {
    fontSize: Platform.isTV ? 16 : 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: Platform.isTV ? 12 : 8,
    right: Platform.isTV ? 12 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    paddingHorizontal: Platform.isTV ? 10 : 6,
    paddingVertical: Platform.isTV ? 6 : 4,
    borderRadius: 4,
    gap: Platform.isTV ? 6 : 4,
  },
  liveIndicator: {
    width: Platform.isTV ? 8 : 6,
    height: Platform.isTV ? 8 : 6,
    borderRadius: Platform.isTV ? 4 : 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: Platform.isTV ? 14 : 10,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    bottom: Platform.isTV ? 12 : 8,
    right: Platform.isTV ? 12 : 8,
    width: Platform.isTV ? 44 : 32,
    height: Platform.isTV ? 44 : 32,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: Platform.isTV ? 22 : 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoritesContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.isTV ? 40 : 20,
  },
  emptyText: {
    marginTop: Platform.isTV ? 30 : 20,
    fontSize: Platform.isTV ? 28 : 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptySubtext: {
    marginTop: Platform.isTV ? 15 : 10,
    fontSize: Platform.isTV ? 20 : 14,
    color: '#666',
    textAlign: 'center',
  },
});