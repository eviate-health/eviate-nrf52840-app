/**
 * Writes a complete session window to Firebase Realtime Database.
 *
 * Schema matches the ESP32 pipeline exactly:
 *
 * sessions/{sessionId}/
 *   metadata/
 *     device_id        : string   e.g. "NRF_EV01"
 *     accel_range_g    : number
 *     gyro_range_dps   : number
 *     sample_rate_hz   : number
 *     sample_count     : number
 *     window_size_sec  : number
 *     session_start_ms : number   Unix ms (phone wall clock)
 *     label            : string   empty — filled via firebase_manager.py
 *   samples/            array of {ax,ay,az,gx,gy,gz,temp,t_ms}
 *   stats/              {accel:{...}, gyro:{...}, temp:{...}}
 */

import { ref, set } from 'firebase/database';
import { db } from './firebase';
import type { DeviceMeta, Sample } from './bleParser';
import type { WindowStats } from './statsComputer';

export async function writeSession(
  sessionId:  string,
  meta:       DeviceMeta,
  samples:    Sample[],
  stats:      WindowStats,
  startMs:    number
): Promise<void> {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  await set(sessionRef, {
    metadata: {
      device_id:        meta.device_id,
      accel_range_g:    meta.accel_range_g,
      gyro_range_dps:   meta.gyro_range_dps,
      sample_rate_hz:   meta.sample_rate_hz,
      sample_count:     samples.length,
      window_size_sec:  samples.length / meta.sample_rate_hz,
      session_start_ms: startMs,
      label:            '',
    },
    samples,
    stats,
  });
}
