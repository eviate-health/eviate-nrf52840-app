import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { parsePacket, SensorReading } from './bleParser';
import { writeReading } from './firestoreWriter';

/* NUS UUIDs — fixed by the Nordic spec */
const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify

const DEVICE_NAME = 'Eviate-Sensor';

export type BleStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export interface BleState {
  status: BleStatus;
  latestReading: SensorReading | null;
  errorMsg: string | null;
  packetCount: number;
  startScan: () => void;
  disconnect: () => void;
}

export function useBleDevice(sessionId: string): BleState {
  const manager = useRef(new BleManager()).current;
  const deviceRef = useRef<Device | null>(null);

  const [status, setStatus]           = useState<BleStatus>('idle');
  const [latestReading, setLatest]    = useState<SensorReading | null>(null);
  const [errorMsg, setError]          = useState<string | null>(null);
  const [packetCount, setPacketCount] = useState(0);

  useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, [manager]);

  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(granted).every(
      (v) => v === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  const disconnect = useCallback(() => {
    deviceRef.current?.cancelConnection();
    deviceRef.current = null;
    setStatus('idle');
  }, []);

  const startScan = useCallback(async () => {
    setError(null);

    const hasPerms = await requestAndroidPermissions();
    if (!hasPerms) {
      setError('Bluetooth permissions denied');
      setStatus('error');
      return;
    }

    const btState = await manager.state();
    if (btState !== State.PoweredOn) {
      setError('Bluetooth is off — please enable it');
      setStatus('error');
      return;
    }

    setStatus('scanning');

    manager.startDeviceScan(
      [NUS_SERVICE_UUID],
      { allowDuplicates: false },
      async (err, device) => {
        if (err) {
          setError(err.message);
          setStatus('error');
          return;
        }
        if (!device || device.name !== DEVICE_NAME) return;

        manager.stopDeviceScan();
        setStatus('connecting');

        try {
          const connected = await device.connect();
          await connected.discoverAllServicesAndCharacteristics();
          deviceRef.current = connected;
          setStatus('connected');

          connected.monitorCharacteristicForService(
            NUS_SERVICE_UUID,
            NUS_TX_CHAR_UUID,
            (charErr, characteristic) => {
              if (charErr || !characteristic?.value) return;
              const reading = parsePacket(characteristic.value);
              if (!reading) return;

              setLatest(reading);
              setPacketCount((c) => c + 1);

              // Fire-and-forget; errors logged to console only
              writeReading(sessionId, reading).catch(console.error);
            }
          );

          connected.onDisconnected(() => {
            deviceRef.current = null;
            setStatus('idle');
          });
        } catch (connectErr: any) {
          setError(connectErr.message ?? 'Connection failed');
          setStatus('error');
        }
      }
    );
  }, [manager, sessionId]);

  return { status, latestReading, errorMsg, packetCount, startScan, disconnect };
}
