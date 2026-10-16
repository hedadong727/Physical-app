import React from 'react';
import { InstantaneousState, MotionAnalysis, PhysicsPreset } from '../types/physics';
import {
  Activity,
  Calculator,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface PhysicsDataBoardProps {
  currentState: InstantaneousState;
  analysis: MotionAnalysis;
  currentPreset?: PhysicsPreset;
}

export const PhysicsDataBoard: React.FC<PhysicsDataBoardProps> = ({
  currentState,
  analysis,
  currentPreset,
}) => {
  return (
    <div className="space-y-4 text-slate-100">
      {/* 1. Real-time Numerical Vectors Table (高精遥测瞬时矢量读数台) */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="font-extrabold text-slate-100 text-sm">
              当前时刻物理量瞬时值 (定量矢量计算遥测)
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-400 bg-black/60 border border-slate-700 px-2.5 py-1 rounded shadow-inner">
            t = {currentState.t.toFixed(2)} s
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Displacement Block */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-sky-500/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-sky-400">
                位移矢量 s⃗
              </span>
              <span className="font-mono font-extrabold text-sky-300 text-base">
                {currentState.s.toFixed(2)} m
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">s_x =</span>
                <span className="font-bold text-sky-200">{currentState.x.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">s_y =</span>
                <span className="font-bold text-sky-200">{currentState.y.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between text-[11px] text-sky-400 pt-1.5 border-t border-slate-800">
                <span>偏角 θ_s =</span>
                <span className="font-bold">{currentState.sAngleDeg.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* Velocity Block */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-rose-400">
                速度矢量 v⃗ (切线)
              </span>
              <span className="font-mono font-extrabold text-rose-300 text-base">
                {currentState.v.toFixed(2)} m/s
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">v_x =</span>
                <span className="font-bold text-rose-200">{currentState.vx.toFixed(2)} m/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">v_y =</span>
                <span className="font-bold text-rose-200">{currentState.vy.toFixed(2)} m/s</span>
              </div>
              <div className="flex justify-between text-[11px] text-rose-400 pt-1.5 border-t border-slate-800">
                <span>切线方向 θ_v =</span>
                <span className="font-bold">{currentState.vAngleDeg.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* Acceleration Block */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-amber-400">
                加速度矢量 a⃗
              </span>
              <span className="font-mono font-extrabold text-amber-300 text-base">
                {currentState.a.toFixed(2)} m/s²
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">a_x =</span>
                <span className="font-bold text-amber-200">{currentState.ax.toFixed(2)} m/s²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">a_y =</span>
                <span className="font-bold text-amber-200">{currentState.ay.toFixed(2)} m/s²</span>
              </div>
              <div className="flex justify-between text-[11px] text-amber-400 pt-1.5 border-t border-slate-800">
                <span>合加速度方向 θ_a =</span>
                <span className="font-bold">{currentState.aAngleDeg.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Motion Classification & Theoretical Analysis (合运动性质判别) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Motion Nature Card */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <h3 className="font-extrabold text-slate-100 text-sm">
              合运动性质判别 (物理学理论依据)
            </h3>
          </div>

          <div className="p-3 bg-black/60 rounded-xl border border-emerald-950 space-y-2 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">运动判定结论:</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                {analysis.motionTypeDesc}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {analysis.isStraightLine
                ? '✅ 合初速度 v₀ 矢量与合加速度 a 矢量方向在同一直线上（共线），物体做直线运动。'
                : '⚡ 合初速度 v₀ 矢量与合加速度 a 矢量方向不在同一直线上（成夹角），合外力不断使速度方向发生偏转，物体做曲线运动。'}
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-1 font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div>
              • 运动形式性质: <span className="text-cyan-300 font-bold">{analysis.isConstantVelocity ? '匀速直线运动' : analysis.isUniformAcceleration ? '匀变速运动' : '变速运动'}</span>
            </div>
            {analysis.angleV0andA !== undefined && (
              <div>
                • 初速度与加速度夹角: <span className="text-amber-300 font-bold">{analysis.angleV0andA.toFixed(1)}°</span>
              </div>
            )}
          </div>
        </div>

        {/* Trajectory Equation & Principle */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="font-extrabold text-slate-100 text-sm">
              轨迹方程解析与参数消元
            </h3>
          </div>

          <div className="p-3 bg-black/60 rounded-xl border border-slate-800 space-y-2 shadow-inner">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>运动轨迹函数关系式:</span>
            </div>
            <div className="font-mono text-sm font-extrabold text-cyan-400 bg-slate-900 p-2 rounded-lg border border-slate-700">
              {analysis.trajectoryEquation}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              推导思路：分别列出 x(t) 与 y(t) 的运动学位移公式，消去中间时间参量 t，即可获得直角坐标系中的几何轨迹方程 y = f(x)。
            </p>
          </div>

          {currentPreset && (
            <div className="p-2.5 bg-blue-950/40 rounded-xl border border-blue-900/60 text-xs text-slate-300">
              <span className="font-bold text-cyan-300">💡 当前模型要点: </span>
              {currentPreset.description}
            </div>
          )}
        </div>
      </div>

      {/* 3. Core Physics Principles Display (教学核心三大原理) */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-800">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="font-extrabold text-slate-100 text-sm">
            运动的合成与分解 · 高中物理三大核心原理
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="font-extrabold text-cyan-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              1. 运动的独立性原理
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              一个物体同时参与几个分运动时，各分运动各自独立进行，彼此互不影响。例如平抛运动中，竖直方向自由落体与水平方向匀速直线互不干涉。
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="font-extrabold text-emerald-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              2. 运动的等时性原理
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              合运动与各个分运动经历的时间严格相等。分运动进行多久，合运动就进行多久。时间 t 是连接各个分运动的唯一桥梁。
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="font-extrabold text-rose-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              3. 运动的等效性与平行四边形定则
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              各个分运动的位移、速度、加速度矢量的矢量和与实际合运动完全等效。所有矢量均严格遵循平行四边形定则与三角形定则。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
