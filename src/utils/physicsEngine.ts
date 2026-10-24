import {
  AxisMotionConfig,
  InstantaneousState,
  MotionAnalysis,
  ObservationMode,
  PhysicsPreset,
} from '../types/physics';

/**
 * Standardize configuration based on motion kind.
 */
export function normalizeAxisConfig(cfg: AxisMotionConfig): { v0: number; a: number } {
  if (cfg.kind === 'rest') {
    return { v0: 0, a: 0 };
  }
  if (cfg.kind === 'uniform') {
    return { v0: cfg.v0, a: 0 };
  }
  return { v0: cfg.v0, a: cfg.a };
}

/**
 * Compute the instantaneous physical state at time t.
 */
export function calculateState(
  t: number,
  xCfg: AxisMotionConfig,
  yCfg: AxisMotionConfig,
  mode: ObservationMode
): InstantaneousState {
  const normX = normalizeAxisConfig(xCfg);
  const normY = normalizeAxisConfig(yCfg);

  let vx = normX.v0 + normX.a * t;
  let ax = normX.a;
  let x = normX.v0 * t + 0.5 * normX.a * t * t;

  let vy = normY.v0 + normY.a * t;
  let ay = normY.a;
  let y = normY.v0 * t + 0.5 * normY.a * t * t;

  if (mode === 'only_x') {
    y = 0;
    vy = 0;
    ay = 0;
  } else if (mode === 'only_y') {
    x = 0;
    vx = 0;
    ax = 0;
  }

  const s = Math.hypot(x, y);
  const sAngleDeg = (Math.atan2(y, x) * 180) / Math.PI;

  const v = Math.hypot(vx, vy);
  const vAngleDeg = (Math.atan2(vy, vx) * 180) / Math.PI;

  const a = Math.hypot(ax, ay);
  const aAngleDeg = (Math.atan2(ay, ax) * 180) / Math.PI;

  return {
    t,
    x,
    y,
    s,
    sAngleDeg,
    vx,
    vy,
    v,
    vAngleDeg,
    ax,
    ay,
    a,
    aAngleDeg,
  };
}

/**
 * Helper to format signed number cleanly in math equations.
 */
function formatTerm(coeff: number, variable: string, isFirst = false): string {
  if (Math.abs(coeff) < 1e-4) return '';
  const rounded = Math.round(coeff * 1000) / 1000;
  const sign = rounded > 0 ? (isFirst ? '' : ' + ') : (isFirst ? '-' : ' - ');
  const absVal = Math.abs(rounded);
  const coeffStr = absVal === 1 && variable ? '' : `${absVal}`;
  return `${sign}${coeffStr}${variable}`;
}

/**
 * Analyze the nature of combined motion and derive trajectory equation.
 */
export function analyzeMotion(
  xCfg: AxisMotionConfig,
  yCfg: AxisMotionConfig,
  mode: ObservationMode
): MotionAnalysis {
  if (mode === 'only_x') {
    const { v0, a } = normalizeAxisConfig(xCfg);
    const isConst = Math.abs(a) < 1e-5;
    const isRest = isConst && Math.abs(v0) < 1e-5;
    return {
      motionTypeDesc: isRest ? '静止状态 (沿X轴)' : isConst ? '沿X轴匀速直线运动' : '沿X轴匀变速直线运动',
      isStraightLine: true,
      isUniformAcceleration: !isConst,
      isConstantVelocity: isConst && !isRest,
      trajectoryEquation: 'y = 0',
      formulaDerivation: [
        '分运动观察模式：仅观察 X 轴方向运动。',
        `X轴运动学方程：x(t) = ${v0}t + 0.5 × (${a})t²`,
        '质点始终保持在 X 轴上，y 坐标恒为 0。',
      ],
    };
  }

  if (mode === 'only_y') {
    const { v0, a } = normalizeAxisConfig(yCfg);
    const isConst = Math.abs(a) < 1e-5;
    const isRest = isConst && Math.abs(v0) < 1e-5;
    return {
      motionTypeDesc: isRest ? '静止状态 (沿Y轴)' : isConst ? '沿Y轴匀速直线运动' : '沿Y轴匀变速直线运动',
      isStraightLine: true,
      isUniformAcceleration: !isConst,
      isConstantVelocity: isConst && !isRest,
      trajectoryEquation: 'x = 0',
      formulaDerivation: [
        '分运动观察模式：仅观察 Y 轴方向运动。',
        `Y轴运动学方程：y(t) = ${v0}t + 0.5 × (${a})t²`,
        '质点始终保持在 Y 轴上，x 坐标恒为 0。',
      ],
    };
  }

  const nx = normalizeAxisConfig(xCfg);
  const ny = normalizeAxisConfig(yCfg);

  const v0Mag = Math.hypot(nx.v0, ny.v0);
  const aMag = Math.hypot(nx.a, ny.a);

  // Cross product of v0 and a: (v0x * ay - v0y * ax)
  const crossProduct = nx.v0 * ny.a - ny.v0 * nx.a;
  const isCollinear = v0Mag < 1e-5 || aMag < 1e-5 || Math.abs(crossProduct) < 1e-4;

  let angleV0andA: number | undefined;
  if (v0Mag > 1e-5 && aMag > 1e-5) {
    const dot = nx.v0 * nx.a + ny.v0 * ny.a;
    const cosAngle = Math.max(-1, Math.min(1, dot / (v0Mag * aMag)));
    angleV0andA = (Math.acos(cosAngle) * 180) / Math.PI;
  }

  let motionTypeDesc = '';
  let isStraightLine = false;
  let isUniformAcceleration = false;
  let isConstantVelocity = false;

  if (aMag < 1e-5) {
    if (v0Mag < 1e-5) {
      motionTypeDesc = '静止状态 (速度与加速度均为0)';
      isStraightLine = true;
    } else {
      motionTypeDesc = '匀速直线运动 (合外力为0，合加速度 a = 0)';
      isStraightLine = true;
      isConstantVelocity = true;
    }
  } else {
    isUniformAcceleration = true;
    if (isCollinear) {
      motionTypeDesc = '匀变速直线运动 (合加速度 a 与合初速度 v₀ 共线)';
      isStraightLine = true;
    } else {
      motionTypeDesc = '匀变速曲线运动 (合加速度 a 恒定，且与合初速度 v₀ 不共线，轨迹为抛物线)';
      isStraightLine = false;
    }
  }

  // Trajectory Equation Derivation
  let trajectoryEquation = '';
  const formulaDerivation: string[] = [
    `① X方向运动方程：x = ${formatTerm(nx.v0, 't', true) || '0'}${formatTerm(0.5 * nx.a, 't²') || ''}`,
    `② Y方向运动方程：y = ${formatTerm(ny.v0, 't', true) || '0'}${formatTerm(0.5 * ny.a, 't²') || ''}`,
  ];

  if (Math.abs(nx.a) < 1e-5 && Math.abs(ny.a) < 1e-5) {
    // Both uniform
    if (Math.abs(nx.v0) > 1e-5) {
      const k = ny.v0 / nx.v0;
      trajectoryEquation = `y = ${Math.round(k * 1000) / 1000} x`;
      formulaDerivation.push(`由 ① 式消去时间 t = x / (${nx.v0})，代入 ② 式：`);
      formulaDerivation.push(`得轨迹方程为正比例直线：y = (${ny.v0} / ${nx.v0}) x = ${Math.round(k * 1000) / 1000} x`);
    } else if (Math.abs(ny.v0) > 1e-5) {
      trajectoryEquation = 'x = 0';
      formulaDerivation.push('X方向无运动，物体沿竖直直线 (Y轴) 运动：x = 0');
    } else {
      trajectoryEquation = 'x = 0, y = 0';
      formulaDerivation.push('速度与加速度均为0，物体静止在原点。');
    }
  } else if (Math.abs(nx.a) < 1e-5 && Math.abs(nx.v0) > 1e-5) {
    // X is uniform, Y is accelerated (Typical horizontal projectile!)
    const k1 = ny.v0 / nx.v0;
    const k2 = ny.a / (2 * nx.v0 * nx.v0);
    const term1 = formatTerm(k1, 'x', true);
    const term2 = formatTerm(k2, 'x²');
    trajectoryEquation = `y = ${[term1, term2].filter(Boolean).join('') || '0'}`;

    formulaDerivation.push(`由 ① 式得时间参数：t = x / (${nx.v0})`);
    formulaDerivation.push(`代入 ② 式消去 t：y = ${ny.v0}(x/${nx.v0}) + 0.5×(${ny.a})(x/${nx.v0})²`);
    formulaDerivation.push(`化简得二次抛物线轨迹方程：${trajectoryEquation}`);
  } else if (Math.abs(ny.a) < 1e-5 && Math.abs(ny.v0) > 1e-5) {
    // Y is uniform, X is accelerated
    const k1 = nx.v0 / ny.v0;
    const k2 = nx.a / (2 * ny.v0 * ny.v0);
    const term1 = formatTerm(k1, 'y', true);
    const term2 = formatTerm(k2, 'y²');
    trajectoryEquation = `x = ${[term1, term2].filter(Boolean).join('') || '0'}`;

    formulaDerivation.push(`由 ② 式得时间参数：t = y / (${ny.v0})`);
    formulaDerivation.push(`代入 ① 式消去 t：x = ${nx.v0}(y/${ny.v0}) + 0.5×(${nx.a})(y/${ny.v0})²`);
    formulaDerivation.push(`化简得侧向抛物线轨迹方程：${trajectoryEquation}`);
  } else if (isCollinear && Math.abs(nx.a) > 1e-5) {
    // Collinear acceleration
    const slope = ny.a / nx.a;
    trajectoryEquation = `y = ${Math.round(slope * 1000) / 1000} x`;
    formulaDerivation.push('初速度矢量与加速度矢量共线，各分量成等比例变化：');
    formulaDerivation.push(`y / x = a_y / a_x = ${ny.a} / ${nx.a} = ${Math.round(slope * 1000) / 1000}`);
    formulaDerivation.push(`合运动为直线运动，轨迹方程：y = ${Math.round(slope * 1000) / 1000} x`);
  } else {
    // General parametric
    trajectoryEquation = `参数方程：x(t) = ${formatTerm(nx.v0, 't', true) || '0'}${formatTerm(0.5 * nx.a, 't²')}, y(t) = ${formatTerm(ny.v0, 't', true) || '0'}${formatTerm(0.5 * ny.a, 't²')}`;
    formulaDerivation.push('两方向均存在加速度，消去参数 t 得到一般二次曲线方程。');
  }

  return {
    motionTypeDesc,
    isStraightLine,
    isUniformAcceleration,
    isConstantVelocity,
    angleV0andA,
    trajectoryEquation,
    formulaDerivation,
  };
}

/**
 * Standard High School Physics Presets.
 */
export const PHYSICS_PRESETS: PhysicsPreset[] = [
  {
    id: 'wax-block',
    name: '1. 蜡烛 (蜡块演示实验)',
    category: '概念引入实验',
    description: '两个互相垂直的匀速直线运动的合成',
    teachingNote:
      '人教版必修二演示实验：玻璃管沿水平方向匀速移动，管内蜡块/蜡烛沿竖直方向匀速上升。合初速度恒定，合加速度为0，合运动必为匀速直线运动，轨迹为倾斜直线。',
    xConfig: { kind: 'uniform', v0: 4, a: 0 },
    yConfig: { kind: 'uniform', v0: 3, a: 0 },
    duration: 4,
    observationMode: 'both',
    vectorOptions: {
      showDisplacement: false,
      showVelocity: false,
      showAcceleration: false,
      showParallelogram: false,
      showProjections: false,
      showTrajectory: true,
    },
  },
  {
    id: 'linear-composition',
    name: '2. 两个直线运动的合成',
    category: '基础规律与判据',
    description: '两个匀速直线运动的合成（可通过调节下方参数切换为匀加速，探究共线与不共线规律）',
    teachingNote:
      '高中物理核心定则：两个直线运动合成时，合运动性质取决于分运动速度与加速度的关系。初始设置为两个匀速直线运动（合速度恒定、合加速度为0，合运动为倾斜匀速直线运动）。可通过下方控制面板随时调节各分轴初速度与加速度，实时验证共线（直线合运动）与不共线（曲线合运动）！',
    xConfig: { kind: 'uniform', v0: 4, a: 0 },
    yConfig: { kind: 'uniform', v0: 3, a: 0 },
    duration: 4,
    observationMode: 'both',
    vectorOptions: {
      showDisplacement: false,
      showVelocity: false,
      showAcceleration: false,
      showParallelogram: false,
      showProjections: false,
      showTrajectory: true,
    },
  },
  {
    id: 'river-crossing',
    name: '3. 小船过河 (小船渡河模型)',
    category: '经典高考模型',
    description: '水流沿X轴匀速流动 (v_水) + 船动力指向垂直对岸匀速前进 (v_船)',
    teachingNote:
      '渡河时间仅取决于垂直河岸方向的分速度：t = d / v_船，与水流速度 v_水 无关！合位移受水流速度影响向下游偏转，深刻体现分运动的独立性与等时性。',
    xConfig: { kind: 'uniform', v0: 3, a: 0 },
    yConfig: { kind: 'uniform', v0: 4, a: 0 },
    duration: 4,
    observationMode: 'both',
    vectorOptions: {
      showDisplacement: false,
      showVelocity: false,
      showAcceleration: false,
      showParallelogram: false,
      showProjections: false,
      showTrajectory: true,
    },
  },
  {
    id: 'horizontal-projectile',
    name: '4. 平抛 (标准平抛运动)',
    category: '经典高考模型',
    description: '水平方向匀速直线运动 + 竖直方向自由落体运动',
    teachingNote:
      '核心结论：分运动具有独立性与等时性。水平方向合外力为0（匀速直线），竖直方向仅受重力（自由落体）。合加速度竖直向下恒定，合运动为匀变速曲线运动（抛物线）。',
    xConfig: { kind: 'uniform', v0: 6, a: 0 },
    yConfig: { kind: 'uniform_accel', v0: 0, a: -9.8 },
    duration: 3,
    observationMode: 'both',
    vectorOptions: {
      showDisplacement: false,
      showVelocity: false,
      showAcceleration: false,
      showParallelogram: false,
      showProjections: false,
      showTrajectory: true,
    },
  },
  {
    id: 'oblique-projectile',
    name: '5. 斜抛 (斜向上抛运动)',
    category: '经典高考模型',
    description: '水平方向匀速直线运动 + 竖直方向竖直上抛运动',
    teachingNote:
      '斜抛运动可分解为水平方向匀速运动和竖直方向匀变速运动（上抛至最高点后自由下落）。观察最高点处竖直速度减为0，合速度达到最小值且沿水平方向。',
    xConfig: { kind: 'uniform', v0: 5, a: 0 },
    yConfig: { kind: 'uniform_accel', v0: 12, a: -9.8 },
    duration: 2.6,
    observationMode: 'both',
    vectorOptions: {
      showDisplacement: false,
      showVelocity: false,
      showAcceleration: false,
      showParallelogram: false,
      showProjections: false,
      showTrajectory: true,
    },
  },
  {
    id: 'turnaround-curve',
    name: '6. 这个转弯调头 (带反向转折点)',
    category: '探究与拓展',
    description: 'X轴先减速后反向 (v0x=6, ax=-3) + Y轴匀速上升 (vy=3)',
    teachingNote:
      '在 t=2s 时，X方向速度降为0达到最大水平位移，随后反向加速。合运动轨迹形成平滑的极值顶点，可直观观察速度矢量的方向翻转与切线特性。',
    xConfig: { kind: 'uniform_accel', v0: 6, a: -3 },
    yConfig: { kind: 'uniform', v0: 3, a: 0 },
    duration: 4,
    observationMode: 'both',
    vectorOptions: {
      showDisplacement: false,
      showVelocity: false,
      showAcceleration: false,
      showParallelogram: false,
      showProjections: false,
      showTrajectory: true,
    },
  },
];
