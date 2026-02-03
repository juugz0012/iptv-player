import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

interface EPGData {
  current: {
    title: string;
    description: string;
    start: string;
    end: string;
    progress: number;
  } | null;
  next: {
    title: string;
    description: string;
    start: string;
    end: string;
  } | null;
}

interface EPGCardProps {
  streamId: string;
  epgChannelId?: string;
  xtreamConfig: {
    dns_url: string;
    username: string;
    password: string;
  };
  compact?: boolean;
}

export default function EPGCard({ streamId, epgChannelId, xtreamConfig, compact = false }: EPGCardProps) {
  const [epg, setEpg] = useState<EPGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEPG();
  }, [streamId]);

  const loadEPG = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading EPG for stream:', streamId);
      
      // Récupérer l'EPG directement depuis Xtream (côté client)
      const epgUrl = `${xtreamConfig.dns_url}/xmltv.php?username=${xtreamConfig.username}&password=${xtreamConfig.password}`;
      
      const response = await axios.get(epgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        },
        timeout: 10000,
      });
      
      // Parser XML (version simple pour React Native)
      const xmlText = response.data;
      
      // Trouver le channel_id pour ce stream
      const channelId = epgChannelId || streamId;
      
      // Chercher les programmes pour cette chaîne (parsing simple)
      const currentProgram = parseCurrentProgram(xmlText, channelId);
      const nextProgram = parseNextProgram(xmlText, channelId);
      
      console.log('📡 EPG loaded:', currentProgram ? 'Current found' : 'No current', nextProgram ? 'Next found' : 'No next');
      
      setEpg({
        current: currentProgram,
        next: nextProgram,
      });
    } catch (error: any) {
      console.log('❌ EPG error:', error.message);
      setEpg({ current: null, next: null });
    } finally {
      setLoading(false);
    }
  };

  const parseCurrentProgram = (xmlText: string, channelId: string): any => {
    try {
      // Parsing simple du XML pour trouver le programme en cours
      // Cette version est simplifiée - on pourrait utiliser une lib XML si nécessaire
      const now = new Date();
      
      // Regex pour extraire les programmes de cette chaîne
      const programmeRegex = new RegExp(
        `<programme[^>]*channel="${channelId}"[^>]*start="([^"]*)"[^>]*stop="([^"]*)">.*?<title[^>]*>([^<]*)</title>.*?(?:<desc[^>]*>([^<]*)</desc>)?`,
        'gs'
      );
      
      const matches = [...xmlText.matchAll(programmeRegex)];
      
      for (const match of matches) {
        const startStr = match[1].split(' ')[0]; // Format: YYYYMMDDHHmmss
        const stopStr = match[2].split(' ')[0];
        const title = match[3];
        const description = match[4] || '';
        
        const startTime = parseXMLTime(startStr);
        const stopTime = parseXMLTime(stopStr);
        
        if (startTime && stopTime && startTime <= now && now < stopTime) {
          const progress = Math.floor(((now.getTime() - startTime.getTime()) / (stopTime.getTime() - startTime.getTime())) * 100);
          
          return {
            title,
            description,
            start: formatTime(startTime),
            end: formatTime(stopTime),
            progress,
          };
        }
      }
      
      return null;
    } catch (error) {
      console.log('Error parsing current program:', error);
      return null;
    }
  };

  const parseNextProgram = (xmlText: string, channelId: string): any => {
    try {
      const now = new Date();
      
      const programmeRegex = new RegExp(
        `<programme[^>]*channel="${channelId}"[^>]*start="([^"]*)"[^>]*stop="([^"]*)">.*?<title[^>]*>([^<]*)</title>`,
        'gs'
      );
      
      const matches = [...xmlText.matchAll(programmeRegex)];
      
      for (const match of matches) {
        const startStr = match[1].split(' ')[0];
        const stopStr = match[2].split(' ')[0];
        const title = match[3];
        
        const startTime = parseXMLTime(startStr);
        const stopTime = parseXMLTime(stopStr);
        
        if (startTime && startTime > now) {
          return {
            title,
            description: '',
            start: formatTime(startTime),
            end: formatTime(stopTime),
          };
        }
      }
      
      return null;
    } catch (error) {
      console.log('Error parsing next program:', error);
      return null;
    }
  };

  const parseXMLTime = (timeStr: string): Date | null => {
    try {
      // Format: YYYYMMDDHHmmss
      const year = parseInt(timeStr.substring(0, 4));
      const month = parseInt(timeStr.substring(4, 6)) - 1;
      const day = parseInt(timeStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(8, 10));
      const minute = parseInt(timeStr.substring(10, 12));
      const second = parseInt(timeStr.substring(12, 14));
      
      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      return null;
    }
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return null; // Pas de loader pour ne pas ralentir l'affichage
  }

  if (!epg || !epg.current) {
    // Pas d'EPG disponible, ne rien afficher
    return null;
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${epg.current.progress}%` }]} />
        </View>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {epg.current.title}
        </Text>
        <Text style={styles.compactTime}>
          {epg.current.start} - {epg.current.end}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      {/* Programme actuel */}
      <View style={styles.currentProgram}>
        <View style={styles.programHeader}>
          <Ionicons name="play-circle" size={Platform.isTV ? 20 : 16} color="#E50914" />
          <Text style={styles.label}>En cours</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {epg.current.title}
        </Text>
        <Text style={styles.time}>
          {epg.current.start} - {epg.current.end}
        </Text>
        {epg.current.description && (
          <Text style={styles.description} numberOfLines={2}>
            {epg.current.description}
          </Text>
        )}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${epg.current.progress}%` }]} />
        </View>
      </View>

      {/* Programme suivant */}
      {epg.next && (
        <View style={styles.nextProgram}>
          <View style={styles.programHeader}>
            <Ionicons name="time" size={Platform.isTV ? 20 : 16} color="#666" />
            <Text style={styles.labelNext}>Ensuite</Text>
          </View>
          <Text style={styles.titleNext} numberOfLines={1}>
            {epg.next.title}
          </Text>
          <Text style={styles.timeNext}>
            {epg.next.start} - {epg.next.end}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Platform.isTV ? 15 : 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    padding: Platform.isTV ? 10 : 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  compactTitle: {
    fontSize: Platform.isTV ? 14 : 11,
    fontWeight: '600',
    color: '#fff',
    marginTop: Platform.isTV ? 6 : 4,
  },
  compactTime: {
    fontSize: Platform.isTV ? 12 : 10,
    color: '#ccc',
    marginTop: Platform.isTV ? 4 : 2,
  },
  fullContainer: {
    padding: Platform.isTV ? 20 : 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    gap: Platform.isTV ? 20 : 15,
  },
  currentProgram: {
    paddingBottom: Platform.isTV ? 20 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  nextProgram: {
    paddingTop: Platform.isTV ? 10 : 8,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.isTV ? 8 : 6,
    marginBottom: Platform.isTV ? 10 : 8,
  },
  label: {
    fontSize: Platform.isTV ? 16 : 12,
    fontWeight: 'bold',
    color: '#E50914',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelNext: {
    fontSize: Platform.isTV ? 16 : 12,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: Platform.isTV ? 22 : 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Platform.isTV ? 8 : 6,
  },
  titleNext: {
    fontSize: Platform.isTV ? 18 : 14,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: Platform.isTV ? 6 : 4,
  },
  time: {
    fontSize: Platform.isTV ? 16 : 12,
    color: '#E50914',
    fontWeight: '500',
    marginBottom: Platform.isTV ? 8 : 6,
  },
  timeNext: {
    fontSize: Platform.isTV ? 14 : 11,
    color: '#666',
    fontWeight: '500',
  },
  description: {
    fontSize: Platform.isTV ? 14 : 12,
    color: '#aaa',
    lineHeight: Platform.isTV ? 20 : 16,
    marginBottom: Platform.isTV ? 12 : 10,
  },
  progressBar: {
    height: Platform.isTV ? 6 : 4,
    backgroundColor: '#333',
    borderRadius: Platform.isTV ? 3 : 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: Platform.isTV ? 3 : 2,
  },
});
