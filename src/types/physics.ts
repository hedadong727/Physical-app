/**
 * Types and interfaces for 2D Motion Composition and Resolution simulation.
 */

export type MotionKind = 'rest' | 'uniform' | 'uniform_accel';

export type ObservationMode = 'both' | 'only_x' | 'only_y';

export interface AxisMotionConfig {
  kind: MotionKind;
  v0: number; // m/s (or v for uniform motion)
  a: number;  // m/s^2 (0 for uniform motion / rest)
}

export interface VectorDisplayOptions {
  showDisplacement: boolean;  // 位移矢量与分解
  showVelocity: boolean;      // 速度矢量与分解
  showAcceleration: boolean;  // 加速度矢量与分解
  showParallelogram: boolean; // 平行四边形辅助框
  showProjections: boolean;   // X/Y 轴上的投影小球与虚线
  showTrajectory: boolean;    // 合运动轨迹
  showStrobe: boolean;        // 频闪打点残影
  strobeInterval: number;     // 频闪时间间隔 (s)
}

export interface InstantaneousState {
  t: number;
  // Position / Displacement (from origin (0,0))
  x: number;
  y: number;
  s: number;       // resultant displacement |s|
  sAngleDeg: number; // direction of displacement in degrees
  // Velocity
  vx: number;
  vy: number;
  v: number;       // resultant velocity |v|
  vAngleDeg: number; // direction of velocity in degrees
  // Acceleration
  ax: number;
  ay: number;
  a: number;       // resultant acceleration |a|
  aAngleDeg: number; // direction of acceleration in degrees
}

export interface MotionAnalysis {
  motionTypeDesc: string;     // e.g. "匀变速曲线运动"
  isStraightLine: boolean;    // 是否为直线运动
  isUniformAcceleration: boolean; // 是否为匀变速
  isConstantVelocity: boolean;    // 是否为匀速
  angleV0andA?: number;       // 初速度与加速度夹角 (度)
  trajectoryEquation: string; // 轨迹方程文本
  formulaDerivation: string[];// 推导步骤
}

export interface PhysicsPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  teachingNote: string;
  xConfig: AxisMotionConfig;
  yConfig: AxisMotionConfig;
  duration: number;
  observationMode: ObservationMode;
  vectorOptions?: Partial<VectorDisplayOptions>;
}
