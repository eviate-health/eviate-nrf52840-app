/**
 * Computes per-axis and magnitude statistics for a window of samples.
 * Output format matches the ESP32 Firebase schema exactly.
 */

import type { Sample } from './bleParser';

interface AxisStats {
  mean: number;
  std:  number;
  min:  number;
  max:  number;
  rms:  number;
}

interface SensorStats {
  magnitude_mean: number;
  magnitude_std:  number;
  x: AxisStats;
  y: AxisStats;
  z: AxisStats;
}

export interface WindowStats {
  accel: SensorStats;
  gyro:  SensorStats;
  temp: {
    mean: number;
    min:  number;
    max:  number;
  };
}

function axisStats(values: number[]): AxisStats {
  const n    = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const min  = Math.min(...values);
  const max  = Math.max(...values);
  const rms  = Math.sqrt(values.reduce((a, b) => a + b * b, 0) / n);
  const std  = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return {
    mean: +mean.toFixed(4),
    std:  +std.toFixed(4),
    min:  +min.toFixed(4),
    max:  +max.toFixed(4),
    rms:  +rms.toFixed(4),
  };
}

function magnitudeStats(
  xs: number[], ys: number[], zs: number[]
): Pick<SensorStats, 'magnitude_mean' | 'magnitude_std'> {
  const mags = xs.map((_, i) =>
    Math.sqrt(xs[i] ** 2 + ys[i] ** 2 + zs[i] ** 2)
  );
  const n    = mags.length;
  const mean = mags.reduce((a, b) => a + b, 0) / n;
  const std  = Math.sqrt(mags.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return {
    magnitude_mean: +mean.toFixed(4),
    magnitude_std:  +std.toFixed(4),
  };
}

export function computeStats(samples: Sample[]): WindowStats {
  const ax   = samples.map(s => s.ax);
  const ay   = samples.map(s => s.ay);
  const az   = samples.map(s => s.az);
  const gx   = samples.map(s => s.gx);
  const gy   = samples.map(s => s.gy);
  const gz   = samples.map(s => s.gz);
  const temp = samples.map(s => s.temp);

  const accelMag = magnitudeStats(ax, ay, az);
  const gyroMag  = magnitudeStats(gx, gy, gz);
  const temps    = temp;
  const tempMean = temps.reduce((a, b) => a + b, 0) / temps.length;

  return {
    accel: {
      ...accelMag,
      x: axisStats(ax),
      y: axisStats(ay),
      z: axisStats(az),
    },
    gyro: {
      ...gyroMag,
      x: axisStats(gx),
      y: axisStats(gy),
      z: axisStats(gz),
    },
    temp: {
      mean: +tempMean.toFixed(4),
      min:  +Math.min(...temps).toFixed(4),
      max:  +Math.max(...temps).toFixed(4),
    },
  };
}
