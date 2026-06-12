/**
 * Parses the 20-byte NUS packet sent by the nRF52840 firmware.
 *
 * Packet layout (little-endian):
 *  [0-1]   accel_x  int16  mG
 *  [2-3]   accel_y  int16  mG
 *  [4-5]   accel_z  int16  mG
 *  [6-7]   gyro_x   int16  mdps
 *  [8-9]   gyro_y   int16  mdps
 *  [10-11] gyro_z   int16  mdps
 *  [12-13] hr_bpm   uint16 BPM*10
 *  [14-15] adc_raw  uint16 counts
 *  [16-19] timestamp_ms uint32 ms since boot
 */

export interface SensorReading {
  accel: { x: number; y: number; z: number };  // in mG
  gyro:  { x: number; y: number; z: number };  // in mdps
  hr_bpm: number;                               // BPM (float, one decimal)
  adc_raw: number;                              // raw ADC counts
  device_timestamp_ms: number;                  // ms since device boot
  phone_timestamp: number;                      // Unix ms when received
}

export function parsePacket(base64: string): SensorReading | null {
  try {
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length < 20) return null;

    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength
    );

    return {
      accel: {
        x: view.getInt16(0, true),
        y: view.getInt16(2, true),
        z: view.getInt16(4, true),
      },
      gyro: {
        x: view.getInt16(6, true),
        y: view.getInt16(8, true),
        z: view.getInt16(10, true),
      },
      hr_bpm:              view.getUint16(12, true) / 10,
      adc_raw:             view.getUint16(14, true),
      device_timestamp_ms: view.getUint32(16, true),
      phone_timestamp:     Date.now(),
    };
  } catch {
    return null;
  }
}
