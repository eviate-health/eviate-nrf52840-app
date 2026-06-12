/**
 * Parses NUS TX notifications from the nRF52840 firmware.
 *
 * Packet types (first byte):
 *   0x01  MetaPacket  — sent once on connect
 *   0x02  SamplePacket — sent at 50 Hz
 *
 * MetaPacket (14 bytes):
 *   [0]     type            = 0x01
 *   [1-8]   device_id       ASCII string
 *   [9]     accel_range_g   uint8
 *   [10-11] gyro_range_dps  uint16 LE
 *   [12]    sample_rate_hz  uint8
 *   [13]    window_size     uint8
 *
 * SamplePacket (19 bytes):
 *   [0]     type   = 0x02
 *   [1-2]   ax     int16 LE  m/s² × 100
 *   [3-4]   ay     int16 LE  m/s² × 100
 *   [5-6]   az     int16 LE  m/s² × 100
 *   [7-8]   gx     int16 LE  dps  × 10
 *   [9-10]  gy     int16 LE  dps  × 10
 *   [11-12] gz     int16 LE  dps  × 10
 *   [13-14] temp   int16 LE  °C   × 100
 *   [15-18] t_ms   uint32 LE ms since boot
 */

export const PKT_TYPE_META   = 0x01;
export const PKT_TYPE_SAMPLE = 0x02;

export interface DeviceMeta {
  device_id:      string;
  accel_range_g:  number;
  gyro_range_dps: number;
  sample_rate_hz: number;
  window_size:    number;
}

export interface Sample {
  ax:   number;   // m/s²
  ay:   number;
  az:   number;
  gx:   number;   // dps
  gy:   number;
  gz:   number;
  temp: number;   // °C
  t_ms: number;   // ms since boot
}

export type ParsedPacket =
  | { type: 'meta';   data: DeviceMeta }
  | { type: 'sample'; data: Sample }
  | null;

export function parsePacket(base64: string): ParsedPacket {
  try {
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length < 1) return null;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const type = view.getUint8(0);

    if (type === PKT_TYPE_META && bytes.length >= 14) {
      const idBytes = bytes.slice(1, 9);
      const device_id = String.fromCharCode(...idBytes).replace(/\0/g, '').trim();
      return {
        type: 'meta',
        data: {
          device_id,
          accel_range_g:  view.getUint8(9),
          gyro_range_dps: view.getUint16(10, true),
          sample_rate_hz: view.getUint8(12),
          window_size:    view.getUint8(13),
        },
      };
    }

    if (type === PKT_TYPE_SAMPLE && bytes.length >= 19) {
      return {
        type: 'sample',
        data: {
          ax:   view.getInt16(1,  true) / 100,
          ay:   view.getInt16(3,  true) / 100,
          az:   view.getInt16(5,  true) / 100,
          gx:   view.getInt16(7,  true) / 10,
          gy:   view.getInt16(9,  true) / 10,
          gz:   view.getInt16(11, true) / 10,
          temp: view.getInt16(13, true) / 100,
          t_ms: view.getUint32(15, true),
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}
