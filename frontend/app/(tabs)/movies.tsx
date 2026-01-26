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
import { xtreamAPI } from '../../utils/api';

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

export default function MoviesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [movies, setMovies] = useState<VODStream[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<VODStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    loadCategories();
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

  const handleMoviePress = (movie: VODStream) => {
    router.push({
      pathname: '/player',
      params: {
        streamId: movie.stream_id.toString(),
        streamType: 'movie',
        title: movie.name,
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
          {item.name}
        </Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
      </View>
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    margin: 16,
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
});
