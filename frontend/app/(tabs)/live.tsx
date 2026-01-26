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
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { xtreamAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

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

export default function LiveTVScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const { currentProfile } = useAuth();

  useEffect(() => {
    loadCategories();
  }, []);

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

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await xtreamAPI.getLiveCategories();
      setCategories(response.data || []);
      
      // Load all streams by default
      loadStreams();
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

  const loadStreams = async (categoryId?: string) => {
    try {
      setLoadingStreams(true);
      console.log('🔍 Tentative de chargement des chaînes...');
      console.log('📡 URL:', 'http://uwmuyyff.leadernoob.xyz/player_api.php');
      console.log('👤 Username:', 'C9FFWBSS');
      console.log('🔑 Password:', '13R3ZLL9');
      
      const response = await xtreamAPI.getLiveStreams(categoryId);
      const streamData = response.data || [];
      
      console.log('✅ Succès! Nombre de chaînes:', streamData.length);
      setStreams(streamData);
      setFilteredStreams(streamData);
      setSelectedCategory(categoryId || null);
    } catch (error: any) {
      console.error('❌ Erreur complète:', error);
      console.error('📊 Error message:', error.message);
      console.error('📡 Response status:', error.response?.status);
      console.error('📄 Response data:', error.response?.data);
      console.error('🔧 Request config:', error.config?.url);
      
      Alert.alert(
        'Erreur de connexion',
        `Détails: ${error.message}\n\nStatus: ${error.response?.status || 'N/A'}\n\nCeci est une erreur de connexion au serveur IPTV. Vérifiez votre connexion internet.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingStreams(false);
    }
  };

  const groupStreamsByName = (streams: Stream[]) => {
    const grouped: { [key: string]: Stream[] } = {};
    
    streams.forEach(stream => {
      // Extract base channel name (remove quality indicators)
      const baseName = stream.name
        .replace(/\s*(HD|FHD|4K|SD|UHD)\s*$/i, '')
        .trim();
      
      if (!grouped[baseName]) {
        grouped[baseName] = [];
      }
      grouped[baseName].push(stream);
    });
    
    return grouped;
  };

  const handleStreamPress = (stream: Stream, variants?: Stream[]) => {
    if (variants && variants.length > 1) {
      // Show quality selection
      Alert.alert(
        stream.name,
        'Choisissez la qualité',
        variants.map(variant => ({
          text: variant.name,
          onPress: () => playStream(variant),
        })),
        { cancelable: true }
      );
    } else {
      playStream(stream);
    }
  };

  const playStream = (stream: Stream) => {
    router.push({
      pathname: '/player',
      params: {
        streamId: stream.stream_id.toString(),
        streamType: 'live',
        title: stream.name,
      },
    });
  };

  const renderStream = ({ item }: { item: [string, Stream[]] }) => {
    const [baseName, variants] = item;
    const mainStream = variants[0];
    
    return (
      <TouchableOpacity
        style={styles.streamCard}
        onPress={() => handleStreamPress(mainStream, variants)}
      >
        <View style={styles.streamIcon}>
          <Ionicons name="tv" size={32} color="#E50914" />
        </View>
        <View style={styles.streamInfo}>
          <Text style={styles.streamName} numberOfLines={2}>
            {baseName}
          </Text>
          {variants.length > 1 && (
            <Text style={styles.streamQuality}>
              {variants.length} qualités disponibles
            </Text>
          )}
        </View>
        <Ionicons name="play-circle" size={32} color="#fff" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const groupedStreams = Object.entries(groupStreamsByName(filteredStreams));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>TV en Direct</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une chaîne..."
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
          data={[{ category_id: '', category_name: 'Toutes', parent_id: 0 }, ...categories]}
          keyExtractor={(item) => item.category_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === (item.category_id || null) && styles.categoryChipActive,
              ]}
              onPress={() => loadStreams(item.category_id || undefined)}
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

      {loadingStreams ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlatList
          data={groupedStreams}
          keyExtractor={(item) => item[0]}
          renderItem={renderStream}
          contentContainerStyle={styles.streamsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="tv-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucune chaîne trouvée' : 'Aucune chaîne disponible'}
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
  streamsList: {
    padding: 16,
  },
  streamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  streamIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  streamInfo: {
    flex: 1,
  },
  streamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  streamQuality: {
    fontSize: 12,
    color: '#00AA13',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});
