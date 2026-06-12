import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useBleDevice } from '../src/useBleDevice';

const STATUS_COLOR: Record<string, string> = {
  idle:       '#888',
  scanning:   '#f0a500',
  connecting: '#f0a500',
  connected:  '#22c55e',
  error:      '#ef4444',
};

export default function HomeScreen() {
  const {
    status, latestSample, deviceMeta, errorMsg,
    packetCount, sessionCount, startScan, disconnect,
  } = useBleDevice();

  const s = latestSample;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Eviate Sensor</Text>

        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] }]}>
          <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
        </View>

        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, status !== 'idle' && status !== 'error' && styles.btnDim]}
            onPress={startScan}
            disabled={status !== 'idle' && status !== 'error'}
          >
            <Text style={styles.btnText}>
              {status === 'scanning' ? 'Scanning…' : 'Connect'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnGrey]} onPress={disconnect}>
            <Text style={styles.btnText}>Disconnect</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.counter}>Samples: {packetCount}  |  Sessions written: {sessionCount}</Text>

        {deviceMeta && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Device</Text>
            <Row label="ID"           value={deviceMeta.device_id} />
            <Row label="Accel range"  value={`±${deviceMeta.accel_range_g} g`} />
            <Row label="Gyro range"   value={`±${deviceMeta.gyro_range_dps} dps`} />
            <Row label="Sample rate"  value={`${deviceMeta.sample_rate_hz} Hz`} />
            <Row label="Window size"  value={`${deviceMeta.window_size} samples`} />
          </View>
        )}

        {s && (
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>Latest Sample</Text>
            <Row label="Accel X/Y/Z (m/s²)" value={`${s.ax.toFixed(2)} / ${s.ay.toFixed(2)} / ${s.az.toFixed(2)}`} />
            <Row label="Gyro X/Y/Z (dps)"   value={`${s.gx.toFixed(1)} / ${s.gy.toFixed(1)} / ${s.gz.toFixed(1)}`} />
            <Row label="Temperature"         value={`${s.temp.toFixed(2)} °C`} />
            <Row label="Device uptime"       value={`${s.t_ms} ms`} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 24, alignItems: 'center' },
  title:     { fontSize: 28, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  badge:     { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  badgeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  error:     { color: '#ef4444', marginBottom: 8, textAlign: 'center' },
  row:       { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn:       { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnGrey:   { backgroundColor: '#475569' },
  btnDim:    { opacity: 0.5 },
  btnText:   { color: '#fff', fontWeight: '600' },
  counter:   { color: '#94a3b8', marginBottom: 20, fontSize: 13 },
  card:      { width: '100%', backgroundColor: '#1e293b', borderRadius: 14, padding: 16 },
  cardTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 15, marginBottom: 10 },
  dataRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5,
               borderBottomWidth: 1, borderBottomColor: '#334155' },
  dataLabel: { color: '#94a3b8', fontSize: 13 },
  dataValue: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
});
