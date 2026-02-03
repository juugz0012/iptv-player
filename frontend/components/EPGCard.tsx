import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { xtreamAPI } from '../utils/api';

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
  compact?: boolean;
}

export default function EPGCard({ streamId, compact = false }: EPGCardProps) {
  const [epg, setEpg] = useState<EPGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEPG();
  }, [streamId]);

  const loadEPG = async () => {
    try {
      setLoading(true);
      const response = await xtreamAPI.getEPG(streamId);
      setEpg(response.data);
    } catch (error) {
      console.log('EPG non disponible pour', streamId);
      setEpg({ current: null, next: null });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#E50914" />
      </View>
    );
  }

  if (!epg || !epg.current) {
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
