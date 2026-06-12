import { ref, push, serverTimestamp } from 'firebase/database';
import { db } from './firebase';
import type { SensorReading } from './bleParser';

/**
 * Realtime Database schema:
 *
 * sessions/{sessionId}/readings/{push-id}
 * {
 *   accel_x, accel_y, accel_z   : number  (mG)
 *   gyro_x,  gyro_y,  gyro_z    : number  (mdps)
 *   hr_bpm                      : number  (BPM)
 *   adc_raw                     : number  (counts)
 *   device_ts_ms                : number  (ms since device boot)
 *   server_ts                   : ServerValue.TIMESTAMP
 * }
 */

export async function writeReading(
  sessionId: string,
  reading: SensorReading
): Promise<void> {
  const readingsRef = ref(db, `sessions/${sessionId}/readings`);
  await push(readingsRef, {
    accel_x:      reading.accel.x,
    accel_y:      reading.accel.y,
    accel_z:      reading.accel.z,
    gyro_x:       reading.gyro.x,
    gyro_y:       reading.gyro.y,
    gyro_z:       reading.gyro.z,
    hr_bpm:       reading.hr_bpm,
    adc_raw:      reading.adc_raw,
    device_ts_ms: reading.device_timestamp_ms,
    server_ts:    serverTimestamp(),
  });
}
