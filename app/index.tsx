import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useBleDevice } from '../src/useBleDevice';

/* One session ID per app launch — swap for a proper UUID lib in production */
const SESSION_ID = `session_${Date.now()}`;

const STATUS_COLOR: Record<string, string> = {
  idle:       '#888',
  scanning:   '#f0a500',
  connecting: '#f0a500',
  connected:  '#22c55e',
  error:      '#ef4444',
};

export default function HomeScreen() {
  const { status, latestReading, errorMsg, packetCount, startScan, disconnect } =
    useBleDevice(SESSION_ID);

  const r = latestReading;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Eviate Sensor</Text>

        {/* Status bar */}
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[status] }]}>
          <Text style={styles.statusText}>{status.toUpperCase()}</Text>
        </View>

        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        {/* Buttons */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, status !== 'idle' && styles.btnDisabled]}
            onPress={startScan}
            disabled={status !== 'idle' && status !== 'error'}
          >
            <Text style={styles.btnText}>
              {status === 'scanning' ? 'Scanning…' : 'Connect'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={disconnect}
          >
            <Text style={styles.btnText}>Disconnect</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.counter}>Packets received: {packetCount}</Text>
        <Text style={styles.session}>Session: {SESSION_ID}</Text>

        {/* Latest reading */}
        {r && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Latest Reading</Text>
            <Row label="Accel X/Y/Z (mG)"
                 value={`${r.accel.x} / ${r.accel.y} / ${r.accel.z}`} />
            <Row label="Gyro X/Y/Z (mdps)"
                 value={`${r.gyro.x} / ${r.gyro.y} / ${r.gyro.z}`} />
            <Row label="Heart Rate"    value={`${r.hr_bpm.toFixed(1)} BPM`} />
            <Row label="ADC Raw"       value={`${r.adc_raw}`} />
            <Row label="Device Uptime" value={`${r.device_timestamp_ms} ms`} />
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
  safe:        { flex: 1, backgroundColor: '#0f172a' },
  container:   { padding: 24, alignItems: 'center' },
  title:       { fontSize: 28, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  statusText:  { color: '#fff', fontWeight: '600', fontSize: 13 },
  error:       { color: '#ef4444', marginBottom: 8, textAlign: 'center' },
  row:         { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn:         { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnSecondary:{ backgroundColor: '#475569' },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#fff', fontWeight: '600' },
  counter:     { color: '#94a3b8', marginBottom: 4 },
  session:     { color: '#475569', fontSize: 11, marginBottom: 24 },
  card:        { width: '100%', backgroundColor: '#1e293b', borderRadius: 14, padding: 16 },
  cardTitle:   { color: '#f8fafc', fontWeight: '700', fontSize: 16, marginBottom: 12 },
  dataRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
                 borderBottomWidth: 1, borderBottomColor: '#334155' },
  dataLabel:   { color: '#94a3b8', fontSize: 13 },
  dataValue:   { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
});
