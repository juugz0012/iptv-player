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
  Modal,
  ScrollView,
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
  const [groupedChannels, setGroupedChannels] = useState<GroupedChannel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<GroupedChannel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<WatchlistItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<GroupedChannel | null>(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  
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
      const filtered = groupedChannels.filter(channel =>
        channel.baseName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChannels(filtered);
    } else {
      setFilteredChannels(groupedChannels);
    }
  }, [searchQuery, groupedChannels]);

  // Fonction pour extraire le nom de base (sans HD, FHD, SD, 4K, etc.)
  const getBaseName = (name: string): string => {
    // Supprimer les qualités courantes
    const qualityKeywords = [
      'UHD', '4K', 'FHD', 'HD', 'SD', 'HQ', 'LQ',
      'HEVC', 'H265', 'H264',
      'FULL HD', 'FULLHD',
      '1080P', '1080p', '720P', '720p', '480P', '480p',
      '(HD)', '(FHD)', '(SD)', '(4K)',
      '[HD]', '[FHD]', '[SD]', '[4K]',
    ];

    let baseName = name.trim();
    
    // Supprimer les qualités
    qualityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\s*${keyword}\\s*`, 'gi');
      baseName = baseName.replace(regex, ' ');
    });

    // Nettoyer les espaces multiples et trim
    baseName = baseName.replace(/\s+/g, ' ').trim();
    
    return baseName;
  };

  // Fonction pour regrouper les chaînes par nom de base
  const groupChannelsByName = (streamsList: Stream[]): GroupedChannel[] => {
    const groups: { [key: string]: GroupedChannel } = {};

    streamsList.forEach(stream => {
      const baseName = getBaseName(stream.name);
      
      if (!groups[baseName]) {
        groups[baseName] = {
          baseName,
          streams: [],
          stream_icon: stream.stream_icon,
        };
      }
      
      groups[baseName].streams.push(stream);
      
      // Préférer l'icône d'un stream HD si disponible
      if (stream.stream_icon && !groups[baseName].stream_icon) {
        groups[baseName].stream_icon = stream.stream_icon;
      }
    });

    // Trier les streams dans chaque groupe par qualité (HD > FHD > SD)
    Object.values(groups).forEach(group => {
      group.streams.sort((a, b) => {
        const qualityOrder = ['4K', 'UHD', 'FHD', 'FULL HD', 'HD', 'SD', 'LQ'];
        const getQualityIndex = (name: string) => {
          for (let i = 0; i < qualityOrder.length; i++) {
            if (name.toUpperCase().includes(qualityOrder[i])) {
              return i;
            }
          }
          return 999;
        };
        return getQualityIndex(a.name) - getQualityIndex(b.name);
      });
    });

    return Object.values(groups);
  };

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
    if (streamsCache.current.length > 0 && !categoryId) {
      const grouped = groupChannelsByName(streamsCache.current);
      setGroupedChannels(grouped);
      setFilteredChannels(grouped);
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
      const grouped = groupChannelsByName(loadedStreams);
      setGroupedChannels(grouped);
      setFilteredChannels(grouped);
      
      console.log('📊 Groupes créés:', grouped.length);
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

  const handleChannelPress = (channel: GroupedChannel) => {
    if (channel.streams.length === 1) {
      // Une seule qualité, lancer directement
      handlePlayStream(channel.streams[0]);
    } else {
      // Plusieurs qualités, afficher le modal
      setSelectedChannel(channel);
      setShowQualityModal(true);
    }
  };

  const handlePlayStream = (stream: Stream) => {
    setShowQualityModal(false);
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

  const isChannelFavorite = (channel: GroupedChannel): boolean => {
    return channel.streams.some(stream => isFavorite(stream.stream_id));
  };

  const toggleFavorite = async (stream: Stream, e?: any) => {
    if (e) e.stopPropagation();
    if (!userCode || !currentProfile) return;

    try {
      if (isFavorite(stream.stream_id)) {
        await watchlistAPI.removeFromWatchlist(userCode, currentProfile.name, stream.stream_id.toString());
        Alert.alert('✅', 'Retiré de Ma Liste TV');
      } else {
        const watchlistData = {
          user_code: userCode,
          profile_name: currentProfile.name,
          stream_id: stream.stream_id.toString(),
          stream_type: 'live_tv',
          movie_data: {
            name: stream.name || 'Chaîne inconnue',
            stream_icon: stream.stream_icon || '',
            num: stream.num || 0,
            category_id: stream.category_id || '',
          },
        };
        console.log('📤 Sending watchlist data:', JSON.stringify(watchlistData));
        await watchlistAPI.addToWatchlist(watchlistData);
        Alert.alert('✅', 'Ajouté à Ma Liste TV');
      }
      await loadFavorites();
    } catch (error: any) {
      console.error('❌ Error toggling favorite:', error);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de modifier les favoris');
    }
  };

  const getQualityLabel = (streamName: string): string => {
    const name = streamName.toUpperCase();
    if (name.includes('4K') || name.includes('UHD')) return '4K';
    if (name.includes('FHD') || name.includes('FULL HD')) return 'FHD';
    if (name.includes('HD')) return 'HD';
    if (name.includes('SD')) return 'SD';
    return 'STD';
  };

  const renderChannelCard = ({ item }: { item: GroupedChannel }) => {
    const hasMultipleQualities = item.streams.length > 1;
    const firstStream = item.streams[0];

    return (
      <View style={styles.channelCardContainer}>
        <TVFocusable
          style={styles.channelCard}
          onPress={() => handleChannelPress(item)}
        >
          {item.stream_icon ? (
            <Image
              source={{ uri: item.stream_icon }}
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

          <View style={styles.channelInfo}>
            <Text style={styles.channelName} numberOfLines={2}>
              {item.baseName}
            </Text>
          </View>

          {/* Badge Live */}
          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>

          {/* Badge Qualités multiples */}
          {hasMultipleQualities && (
            <View style={styles.qualityBadge}>
              <Ionicons name="options" size={Platform.isTV ? 16 : 12} color="#fff" />
              <Text style={styles.qualityBadgeText}>{item.streams.length}</Text>
            </View>
          )}
        </TVFocusable>

        {/* Bouton Favori - Premier stream du groupe */}
        <TVFocusable
          style={styles.favoriteButton}
          onPress={(e) => toggleFavorite(firstStream, e)}
        >
          <Ionicons
            name={isChannelFavorite(item) ? 'heart' : 'heart-outline'}
            size={Platform.isTV ? 28 : 20}
            color={isChannelFavorite(item) ? '#E50914' : '#fff'}
          />
        </TVFocusable>
      </View>
    );
  };

  const renderFavoriteCard = ({ item }: { item: WatchlistItem }) => {
    const stream: Stream = {
      stream_id: parseInt(item.stream_id),
      name: item.movie_data.name,
      stream_icon: item.movie_data.stream_icon,
      num: item.movie_data.num,
      category_id: item.movie_data.category_id,
      stream_type: 'live',
    } as Stream;

    return (
      <View style={styles.channelCardContainer}>
        <TVFocusable
          style={styles.channelCard}
          onPress={() => handlePlayStream(stream)}
        >
          {stream.stream_icon ? (
            <Image
              source={{ uri: stream.stream_icon }}
              style={styles.channelLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.channelLogoPlaceholder}>
              <Ionicons name="tv" size={Platform.isTV ? 60 : 40} color="#666" />
            </View>
          )}

          <View style={styles.channelInfo}>
            <Text style={styles.channelName} numberOfLines={2}>
              {getBaseName(stream.name)}
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </TVFocusable>

        <TVFocusable
          style={styles.favoriteButton}
          onPress={(e) => toggleFavorite(stream, e)}
        >
          <Ionicons name="heart" size={Platform.isTV ? 28 : 20} color="#E50914" />
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
            {filteredChannels.length} chaînes
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TVFocusable
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
          hasTVPreferredFocus={true}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            Toutes les chaînes
          </Text>
        </TVFocusable>

        <TVFocusable
          style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons
            name="heart"
            size={Platform.isTV ? 24 : 18}
            color={activeTab === 'favorites' ? '#E50914' : '#666'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
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
              data={filteredChannels}
              keyExtractor={(item, index) => `${item.baseName}-${index}`}
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
              renderItem={renderFavoriteCard}
              numColumns={Platform.isTV ? 4 : 2}
              contentContainerStyle={styles.channelsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Modal de sélection de qualité */}
      <Modal
        visible={showQualityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedChannel?.baseName}
              </Text>
              <TVFocusable
                style={styles.modalCloseButton}
                onPress={() => setShowQualityModal(false)}
              >
                <Ionicons name="close" size={Platform.isTV ? 32 : 24} color="#fff" />
              </TVFocusable>
            </View>

            <Text style={styles.modalSubtitle}>
              Choisissez la qualité
            </Text>

            <ScrollView style={styles.modalQualityList}>
              {selectedChannel?.streams.map((stream, index) => (
                <TVFocusable
                  key={stream.stream_id}
                  style={styles.qualityOption}
                  onPress={() => handlePlayStream(stream)}
                  hasTVPreferredFocus={index === 0}
                >
                  <View style={styles.qualityOptionLeft}>
                    <View style={[
                      styles.qualityBadgeLarge,
                      { backgroundColor: index === 0 ? '#E50914' : '#333' }
                    ]}>
                      <Text style={styles.qualityBadgeLargeText}>
                        {getQualityLabel(stream.name)}
                      </Text>
                    </View>
                    <Text style={styles.qualityOptionText}>
                      {stream.name}
                    </Text>
                  </View>
                  <Ionicons name="play-circle" size={Platform.isTV ? 36 : 28} color="#E50914" />
                </TVFocusable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  qualityBadge: {
    position: 'absolute',
    top: Platform.isTV ? 12 : 8,
    left: Platform.isTV ? 12 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 170, 19, 0.9)',
    paddingHorizontal: Platform.isTV ? 10 : 6,
    paddingVertical: Platform.isTV ? 6 : 4,
    borderRadius: 4,
    gap: Platform.isTV ? 4 : 3,
  },
  qualityBadgeText: {
    fontSize: Platform.isTV ? 14 : 10,
    fontWeight: 'bold',
    color: '#fff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Platform.isTV ? '60%' : '90%',
    maxHeight: Platform.isTV ? '80%' : '70%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: Platform.isTV ? 30 : 20,
    borderWidth: 2,
    borderColor: '#E50914',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.isTV ? 20 : 15,
  },
  modalTitle: {
    flex: 1,
    fontSize: Platform.isTV ? 32 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: Platform.isTV ? 10 : 8,
  },
  modalSubtitle: {
    fontSize: Platform.isTV ? 20 : 16,
    color: '#ccc',
    marginBottom: Platform.isTV ? 25 : 20,
  },
  modalQualityList: {
    maxHeight: Platform.isTV ? 500 : 400,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Platform.isTV ? 20 : 15,
    marginBottom: Platform.isTV ? 15 : 10,
    backgroundColor: '#252525',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  qualityOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.isTV ? 20 : 15,
  },
  qualityBadgeLarge: {
    paddingHorizontal: Platform.isTV ? 16 : 12,
    paddingVertical: Platform.isTV ? 10 : 8,
    borderRadius: 8,
  },
  qualityBadgeLargeText: {
    fontSize: Platform.isTV ? 18 : 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  qualityOptionText: {
    flex: 1,
    fontSize: Platform.isTV ? 20 : 16,
    color: '#fff',
    fontWeight: '500',
  },
});
