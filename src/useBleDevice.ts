import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { parsePacket, DeviceMeta, Sample } from './bleParser';
import { computeStats } from './statsComputer';
import { writeSession } from './firestoreWriter';

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const DEVICE_NAME      = 'Eviate-Sensor';
const WINDOW_SIZE      = 100;

export type BleStatus = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';

export interface BleState {
  status:        BleStatus;
  latestSample:  Sample | null;
  deviceMeta:    DeviceMeta | null;
  errorMsg:      string | null;
  packetCount:   number;
  sessionCount:  number;
  startScan:     () => void;
  disconnect:    () => void;
}

export function useBleDevice(): BleState {
  const manager   = useRef(new BleManager()).current;
  const deviceRef = useRef<Device | null>(null);

  /* Rolling sample buffer — fills up to WINDOW_SIZE then flushes */
  const bufferRef     = useRef<Sample[]>([]);
  const metaRef       = useRef<DeviceMeta | null>(null);
  const windowStartMs = useRef<number>(0);

  const [status,       setStatus]       = useState<BleStatus>('idle');
  const [latestSample, setLatest]       = useState<Sample | null>(null);
  const [deviceMeta,   setDeviceMeta]   = useState<DeviceMeta | null>(null);
  const [errorMsg,     setError]        = useState<string | null>(null);
  const [packetCount,  setPacketCount]  = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => { return () => manager.destroy(); }, [manager]);

  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(granted).every(
      v => v === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  const flushWindow = useCallback(async () => {
    const samples = [...bufferRef.current];
    const meta    = metaRef.current;
    bufferRef.current = [];

    if (!meta || samples.length === 0) return;

    const stats     = computeStats(samples);
    const sessionId = `nrf_${meta.device_id.toLowerCase()}_${windowStartMs.current}`;

    setSessionCount(c => c + 1);
    windowStartMs.current = Date.now();

    writeSession(sessionId, meta, samples, stats, Date.now()).catch(console.error);
  }, []);

  const disconnect = useCallback(() => {
    deviceRef.current?.cancelConnection();
    deviceRef.current = null;
    setStatus('idle');
  }, []);

  const startScan = useCallback(async () => {
    setError(null);
    bufferRef.current = [];
    metaRef.current   = null;

    const hasPerms = await requestAndroidPermissions();
    if (!hasPerms) { setError('Bluetooth permissions denied'); setStatus('error'); return; }

    const btState = await manager.state();
    if (btState !== State.PoweredOn) { setError('Bluetooth is off'); setStatus('error'); return; }

    setStatus('scanning');

    manager.startDeviceScan(
      [NUS_SERVICE_UUID],
      { allowDuplicates: false },
      async (err, device) => {
        if (err)  { setError(err.message); setStatus('error'); return; }
        if (!device || device.name !== DEVICE_NAME) return;

        manager.stopDeviceScan();
        setStatus('connecting');

        try {
          const connected = await device.connect();
          await connected.discoverAllServicesAndCharacteristics();
          deviceRef.current = connected;
          windowStartMs.current = Date.now();
          setStatus('connected');

          connected.monitorCharacteristicForService(
            NUS_SERVICE_UUID,
            NUS_TX_CHAR_UUID,
            (charErr, characteristic) => {
              if (charErr || !characteristic?.value) return;

              const parsed = parsePacket(characteristic.value);
              if (!parsed) return;

              if (parsed.type === 'meta') {
                metaRef.current = parsed.data;
                setDeviceMeta(parsed.data);
                windowStartMs.current = Date.now();
                return;
              }

              if (parsed.type === 'sample') {
                const sample = parsed.data;
                setLatest(sample);
                setPacketCount(c => c + 1);

                bufferRef.current.push(sample);
                if (bufferRef.current.length >= WINDOW_SIZE) {
                  flushWindow();
                }
              }
            }
          );

          connected.onDisconnected(() => {
            deviceRef.current = null;
            setStatus('idle');
          });
        } catch (e: any) {
          setError(e.message ?? 'Connection failed');
          setStatus('error');
        }
      }
    );
  }, [manager, flushWindow]);

  return {
    status, latestSample, deviceMeta, errorMsg,
    packetCount, sessionCount, startScan, disconnect,
  };
}
