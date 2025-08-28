
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, Image, FlatList, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { fetchPreview } from './api';
import { load, save, normalizeUrl } from './storage';
import type { WishlistItem } from './types';

const FallbackImg = 'https://via.placeholder.com/64?text=%20';

export default function App() {
  const [storage, setStorage] = useState<{ items: WishlistItem[] }>({ items: [] });
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().then(s => setStorage({ items: s.items }));
  }, []);

  // Deep link handler
  useEffect(() => {
    const handler = ({ url }: { url: string }) => {
      try {
        const u = new URL(url);
        if (u.protocol === 'centscape:' && u.hostname === 'add') {
          const qp = u.searchParams.get('url');
          if (qp) setUrl(decodeURIComponent(qp));
        }
      } catch {}
    };
    Linking.addEventListener('url', handler);
    Linking.getInitialURL().then(initial => { if (initial) handler({ url: initial }); });
    return () => {
      Linking.removeAllListeners('url');
    };
  }, []);

  const onFetch = async () => {
    setLoading(true); setError(null); setPreview(null);
    try {
      const p = await fetchPreview(url);
      setPreview(p);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!preview) return;
    const normalized = normalizeUrl(preview.sourceUrl);
    if (storage.items.some(i => i.normalizedUrl === normalized)) {
      Alert.alert('Duplicate', 'This item is already in your wishlist');
      return;
    }
    const item: WishlistItem = {
      id: String(Date.now()),
      title: preview.title,
      image: preview.image,
      price: preview.price,
      currency: preview.currency,
      siteName: preview.siteName,
      sourceUrl: preview.sourceUrl,
      createdAt: new Date().toISOString(),
      normalizedUrl: normalized
    };
    const items = [item, ...storage.items];
    setStorage({ items });
    await save({ version: 2, items });
    setPreview(null);
    setUrl('');
  };

  const renderItem = ({ item }: { item: WishlistItem }) => (
    <TouchableOpacity accessibilityLabel={`Open ${item.title || 'item'}`} onPress={() => Linking.openURL(item.sourceUrl)} style={{ flexDirection: 'row', padding: 12, gap: 12 }}>
      <Image source={{ uri: item.image || FallbackImg }} onError={() => {}} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }}>{item.title || '(No title)'}</Text>
        <Text>{item.price != null ? `${item.currency || ''} ${item.price}` : 'N/A'}</Text>
        <Text>{new URL(item.sourceUrl).hostname}</Text>
        <Text style={{ color: '#888' }}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, paddingTop: 48, paddingHorizontal: 16, backgroundColor: '#f0fff0' }}>
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 12 }}>Unified Wishlist</Text>

      <TextInput
        accessibilityLabel="URL input"
        value={url}
        onChangeText={setUrl}
        placeholder="Paste product URL"
        autoCapitalize="none"
        autoCorrect={false}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12, backgroundColor: 'white' }}
      />
      <View style={{ height: 8 }} />
      <Button accessibilityLabel="Fetch preview" title="Preview" onPress={onFetch} />

      <View style={{ height: 16 }} />
      {loading && (
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#fff', minHeight: 100 }}>
          <ActivityIndicator />
          <View style={{ height: 8 }} />
          <View style={{ height: 12, backgroundColor: '#eee', borderRadius: 6 }} />
          <View style={{ height: 12, backgroundColor: '#eee', borderRadius: 6, marginTop: 6, width: '60%' }} />
        </View>
      )}
      {error && (
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#fee' }}>
          <Text style={{ color: '#900' }}>{error}</Text>
          <View style={{ height: 8 }} />
          <Button title="Retry" accessibilityLabel="Retry preview" onPress={onFetch} />
        </View>
      )}
      {preview && !loading && (
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#fff', gap: 8 }}>
          <Text style={{ fontWeight: '700' }}>{preview.title || '(No title)'}</Text>
          <Image source={{ uri: preview.image || FallbackImg }} style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: '#eee' }} />
          <Text>{preview.price != null ? `${preview.currency || ''} ${preview.price}` : 'N/A'}</Text>
          <Text>{preview.siteName}</Text>
          <Button title="Add to wishlist" accessibilityLabel="Add to wishlist" onPress={addItem} />
        </View>
      )}

      <View style={{ height: 24 }} />
      <Text style={{ fontSize: 20, fontWeight: '700' }}>My Wishlist</Text>
      <FlatList
        accessibilityLabel="Wishlist items"
        data={storage.items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
      />
    </View>
  );
}
