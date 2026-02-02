import React, { useState, useEffect, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { xtreamAPI } from '../../utils/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Category {
  category_id: string;
  category_name: string;
}

interface SeriesStream {
  series_id: number;
  name: string;
  cover?: string;
  rating?: string;
  category_id: string;
}

export default function SeriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [series, setSeries] = useState<SeriesStream[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<SeriesStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cache pour éviter de recharger à chaque visite
  const cacheRef = useRef({
    categories: [] as Category[],
    series: [] as SeriesStream[],
    lastLoadTime: 0,
  });
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  const router = useRouter();

  useEffect(() => {
    loadCategories();
  }, []);

  // Recharger uniquement si le cache est expiré
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const cacheAge = now - cacheRef.current.lastLoadTime;
      
      if (cacheAge > CACHE_DURATION && cacheRef.current.categories.length > 0) {
        console.log('🔄 Cache expiré, rechargement des séries...');
        loadCategories();
      } else if (cacheRef.current.categories.length === 0) {
        console.log('📥 Premier chargement des séries...');
        loadCategories();
      } else {
        console.log('✅ Utilisation du cache séries (âge: ' + Math.round(cacheAge / 1000) + 's)');
      }
    }, [])
  );

  useEffect(() => {
    if (searchQuery) {
      const filtered = series.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSeries(filtered);
    } else {
      setFilteredSeries(series);
    }
  }, [searchQuery, series]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await xtreamAPI.getSeriesCategories();
      const categoriesData = response.data || [];
      setCategories(categoriesData);
      
      // Mettre à jour le cache
      cacheRef.current.categories = categoriesData;
      cacheRef.current.lastLoadTime = Date.now();
      
      // Load all series by default
      loadSeries();
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

  const loadSeries = async (categoryId?: string) => {
    try {
      setLoadingSeries(true);
      const response = await xtreamAPI.getSeriesStreams(categoryId);
      const seriesData = response.data || [];
      
      setSeries(seriesData);
      setFilteredSeries(seriesData);
      setSelectedCategory(categoryId || null);
      
      // Mettre à jour le cache
      cacheRef.current.series = seriesData;
      cacheRef.current.lastLoadTime = Date.now();
    } catch (error: any) {
      console.error('Error loading series:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de charger les séries'
      );
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleSeriesPress = (serie: SeriesStream) => {
    // Navigate to series detail screen (can be implemented later)
    Alert.alert(
      serie.name,
      'Détails de la série et liste des épisodes \u00e0 venir',
      [
        { text: 'OK' },
      ]
    );
  };

  const renderSeries = ({ item }: { item: SeriesStream }) => (
    <TouchableOpacity
      style={styles.seriesCard}
      onPress={() => handleSeriesPress(item)}
    >
      {item.cover ? (
        <Image
          source={{ uri: item.cover }}
          style={styles.seriesPoster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.seriesPoster, styles.seriesPosterPlaceholder]}>
          <Ionicons name="list" size={48} color="#666" />
        </View>
      )}
      <View style={styles.seriesInfo}>
        <Text style={styles.seriesTitle} numberOfLines={2}>
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
        <Text style={styles.title}>Séries</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une série..."
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
          data={[{ category_id: '', category_name: 'Toutes' }, ...categories]}
          keyExtractor={(item) => item.category_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === (item.category_id || null) && styles.categoryChipActive,
              ]}
              onPress={() => loadSeries(item.category_id || undefined)}
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

      {loadingSeries ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlatList
          data={filteredSeries}
          keyExtractor={(item) => item.series_id.toString()}
          renderItem={renderSeries}
          numColumns={2}
          contentContainerStyle={styles.seriesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucune série trouvée' : 'Aucune série disponible'}
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
  seriesList: {
    padding: 12,
  },
  seriesCard: {
    width: CARD_WIDTH,
    margin: 6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  seriesPoster: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: '#333',
  },
  seriesPosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesInfo: {
    padding: 12,
  },
  seriesTitle: {
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
