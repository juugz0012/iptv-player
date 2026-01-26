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
import axios from 'axios';

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
    
    addResult('🔍 Test 1: Connexion directe à l\'API Xtream Codes');
    
    try {
      const response = await axios.get('http://uwmuyyff.leadernoob.xyz/player_api.php', {
        params: {
          username: 'C9FFWBSS',
          password: '13R3ZLL9'
        },
        headers: {
          'User-Agent': 'Lavf/58.76.100',
        },
        timeout: 10000,
      });
      
      addResult(`✅ Succès! Status: ${response.status}`);
      addResult(`📊 Données reçues: ${JSON.stringify(response.data).substring(0, 200)}...`);
      
      if (response.data.user_info) {
        addResult(`👤 User Info: ${JSON.stringify(response.data.user_info)}`);
      }
    } catch (error: any) {
      addResult(`❌ Erreur: ${error.message}`);
      if (error.response) {
        addResult(`📡 Status: ${error.response.status}`);
        addResult(`📄 Data: ${JSON.stringify(error.response.data)}`);
      }
      addResult(`🔧 Config: ${JSON.stringify(error.config?.url)}`);
    }
    
    addResult('\n🔍 Test 2: Test des catégories live');
    
    try {
      const response = await axios.get('http://uwmuyyff.leadernoob.xyz/player_api.php', {
        params: {
          username: 'C9FFWBSS',
          password: '13R3ZLL9',
          action: 'get_live_categories'
        },
        headers: {
          'User-Agent': 'Lavf/58.76.100',
        },
        timeout: 10000,
      });
      
      addResult(`✅ Catégories récupérées! Count: ${response.data?.length || 0}`);
      if (response.data && response.data.length > 0) {
        addResult(`📺 Première catégorie: ${JSON.stringify(response.data[0])}`);
      }
    } catch (error: any) {
      addResult(`❌ Erreur catégories: ${error.message}`);
      if (error.response) {
        addResult(`📡 Status: ${error.response.status}`);
      }
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
