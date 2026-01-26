import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { currentProfile } = useAuth();

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
});
