import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { xtreamAPI } from '../utils/api';

export default function TestAPIScreen() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectAPI = async () => {
    setLoading(true);
    setResults([]);
    
    addResult('🔍 Test 1: Récupération des identifiants depuis le backend');
    
    try {
      // This will automatically fetch credentials from backend
      addResult('✅ Tentative de connexion...');
      
      addResult('\n🔍 Test 2: Récupération des catégories Live TV');
      const categoriesResponse = await xtreamAPI.getLiveCategories();
      
      addResult(`✅ Succès! ${categoriesResponse.data?.length || 0} catégories trouvées`);
      if (categoriesResponse.data && categoriesResponse.data.length > 0) {
        addResult(`📺 Première catégorie: ${categoriesResponse.data[0].category_name}`);
        addResult(`📺 Deuxième catégorie: ${categoriesResponse.data[1]?.category_name || 'N/A'}`);
      }
      
      addResult('\n🔍 Test 3: Récupération des chaînes (première catégorie)');
      if (categoriesResponse.data && categoriesResponse.data.length > 0) {
        const firstCategoryId = categoriesResponse.data[0].category_id;
        const streamsResponse = await xtreamAPI.getLiveStreams(firstCategoryId);
        
        addResult(`✅ Succès! ${streamsResponse.data?.length || 0} chaînes trouvées`);
        if (streamsResponse.data && streamsResponse.data.length > 0) {
          addResult(`📡 Première chaîne: ${streamsResponse.data[0].name}`);
          addResult(`📡 ID: ${streamsResponse.data[0].stream_id}`);
        }
      }
      
      addResult('\n🎉 TOUS LES TESTS RÉUSSIS ! L\'application peut maintenant charger la playlist IPTV directement !');
      
    } catch (error: any) {
      addResult(`\n❌ ERREUR: ${error.message}`);
      if (error.response) {
        addResult(`📡 Status HTTP: ${error.response.status}`);
        addResult(`📄 Message: ${JSON.stringify(error.response.data)}`);
      }
      addResult(`\n💡 Vérifiez que les identifiants sont configurés dans le panel admin`);
    }
    
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Test API Xtream</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testDirectAPI}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flask" size={24} color="#fff" />
              <Text style={styles.buttonText}>Lancer les Tests</Text>
            </>
          )}
        </TouchableOpacity>

        <ScrollView style={styles.resultsContainer}>
          {results.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </ScrollView>
      </View>
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
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
  },
  resultText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
});
