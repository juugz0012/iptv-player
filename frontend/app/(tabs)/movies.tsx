import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { xtreamAPI, watchlistAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Category {
  category_id: string;
  category_name: string;
}

interface VODStream {
  stream_id: number;
  name: string;
  stream_icon?: string;
  rating?: string;
  category_id: string;
  container_extension?: string;
  added?: string;
}

interface WatchlistItem {
  stream_id: string;
  movie_data: {
    name: string;
    stream_icon?: string;
    rating?: string;
  };
}

export default function MoviesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [movies, setMovies] = useState<VODStream[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<VODStream[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'watchlist'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const { currentProfile, userCode } = useAuth();

  useEffect(() => {
    loadCategories();
    loadWatchlist();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = movies.filter(movie =>
        movie.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMovies(filtered);
    } else {
      setFilteredMovies(movies);
    }
  }, [searchQuery, movies]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await xtreamAPI.getVodCategories();
      setCategories(response.data || []);
      
      // Load all movies by default
      loadMovies();
    } catch (error: any) {
      console.error('Error loading categories:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de charger les catégories'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlist = async () => {
    if (!userCode || !currentProfile) return;
    
    try {
      const response = await watchlistAPI.getWatchlist(userCode, currentProfile.name);
      console.log('📥 Watchlist chargée:', response.data?.length, 'films');
      setWatchlist(response.data || []);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };

  const loadMovies = async (categoryId?: string) => {
    try {
      setLoadingMovies(true);
      const response = await xtreamAPI.getVodStreams(categoryId);
      const movieData = response.data || [];
      
      setMovies(movieData);
      setFilteredMovies(movieData);
      setSelectedCategory(categoryId || null);
    } catch (error: any) {
      console.error('Error loading movies:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de charger les films'
      );
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleMoviePress = (movie: VODStream | WatchlistItem) => {
    const streamId = 'stream_id' in movie ? movie.stream_id : movie.stream_id;
    router.push({
      pathname: '/movie-details',
      params: {
        streamId: streamId.toString(),
        streamType: 'movie',
      },
    });
  };

  const renderMovie = ({ item }: { item: VODStream }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => handleMoviePress(item)}
    >
      {item.stream_icon ? (
        <Image
          source={{ uri: item.stream_icon }}
          style={styles.moviePoster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.moviePoster, styles.moviePosterPlaceholder]}>
          <Ionicons name="film" size={48} color="#666" />
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {typeof item.name === 'string' ? item.name : JSON.stringify(item.name)}
        </Text>
        {item.rating && typeof item.rating !== 'object' && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{String(item.rating)}</Text>
          </View>
        )}
      </View>
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
      </View>
    </TouchableOpacity>
  );

  const renderWatchlistMovie = ({ item }: { item: WatchlistItem }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => handleMoviePress(item)}
    >
      {item.movie_data.stream_icon ? (
        <Image
          source={{ uri: item.movie_data.stream_icon }}
          style={styles.moviePoster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.moviePoster, styles.moviePosterPlaceholder]}>
          <Ionicons name="film" size={48} color="#666" />
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.movie_data.name}
        </Text>
        {item.movie_data.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{String(item.movie_data.rating)}</Text>
          </View>
        )}
      </View>
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
      </View>
      <View style={styles.watchlistBadge}>
        <Ionicons name="bookmark" size={16} color="#E50914" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Films</Text>
      </View>

      {/* Tabs: Tous les films / Ma liste */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Ionicons 
            name="film" 
            size={20} 
            color={selectedTab === 'all' ? '#E50914' : '#888'} 
          />
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            Tous les films
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'watchlist' && styles.tabActive]}
          onPress={() => {
            setSelectedTab('watchlist');
            loadWatchlist();
          }}
        >
          <Ionicons 
            name="bookmark" 
            size={20} 
            color={selectedTab === 'watchlist' ? '#E50914' : '#888'} 
          />
          <Text style={[styles.tabText, selectedTab === 'watchlist' && styles.tabTextActive]}>
            Ma liste ({watchlist.length})
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'all' ? (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un film..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.categoriesScroll}>
            <FlatList
              horizontal
              data={[{ category_id: '', category_name: 'Tous' }, ...categories]}
              keyExtractor={(item) => item.category_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory === (item.category_id || null) && styles.categoryChipActive,
                  ]}
                  onPress={() => loadMovies(item.category_id || undefined)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === (item.category_id || null) && styles.categoryChipTextActive,
                    ]}
                  >
                    {item.category_name}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContent}
            />
          </View>

          {loadingMovies ? (
            <View style={[styles.container, styles.centerContent]}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          ) : (
            <FlatList
              data={filteredMovies}
              keyExtractor={(item) => item.stream_id.toString()}
              renderItem={renderMovie}
              numColumns={2}
              contentContainerStyle={styles.moviesList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="film-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Aucun film trouvé' : 'Aucun film disponible'}
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item.stream_id}
          renderItem={renderWatchlistMovie}
          numColumns={2}
          contentContainerStyle={styles.moviesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>Aucun film dans votre liste</Text>
              <Text style={styles.emptySubtext}>
                Ajoutez des films à votre liste depuis la page de détails
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#222',
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#2a0a0e',
    borderWidth: 2,
    borderColor: '#E50914',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#E50914',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#fff',
  },
  categoriesScroll: {
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#222',
    borderRadius: 20,
    marginRight: 12,
  },
  categoryChipActive: {
    backgroundColor: '#E50914',
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  moviesList: {
    padding: 12,
  },
  movieCard: {
    width: CARD_WIDTH,
    margin: 6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
    position: 'relative',
  },
  moviePoster: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: '#333',
  },
  moviePosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfo: {
    padding: 12,
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 4,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  watchlistBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    width: width - 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
});
