import React from 'react';
import { VectorDisplayOptions } from '../types/physics';
import {
  Compass,
  Grid,
  Route,
  Camera,
} from 'lucide-react';

interface VectorTogglesProps {
  options: VectorDisplayOptions;
  onChange: (options: VectorDisplayOptions) => void;
}

export const VectorToggles: React.FC<VectorTogglesProps> = ({
  options,
  onChange,
}) => {
  const toggleKey = (key: keyof VectorDisplayOptions) => {
    onChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-3.5 text-slate-100">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.5)]">
            <Compass className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-slate-100 text-sm tracking-tight">
            矢量合成与分解选项 (课堂演示核心)
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-bold font-mono">
          [ 实时叠加标绘 ]
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Displacement Vector (3D tactile card) */}
        <div
          onClick={() => toggleKey('showDisplacement')}
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
            options.showDisplacement
              ? 'bg-gradient-to-b from-sky-950 to-slate-900 border-2 border-sky-400 shadow-[0_4px_0_#0369a1,inset_0_2px_4px_rgba(56,189,248,0.2),0_0_16px_rgba(56,189,248,0.25)] translate-y-0.5'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border-slate-700 shadow-[0_4px_0_#0f172a,0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#0f172a]'
          }`}
        >
          <input
            type="checkbox"
            checked={options.showDisplacement}
            onChange={() => {}}
            className="mt-0.5 rounded text-sky-500 focus:ring-sky-400 w-4 h-4 pointer-events-none cursor-pointer accent-sky-500"
          />
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-100">
              <span className="w-2.5 h-1.5 bg-sky-400 rounded-xs shadow-[0_0_6px_#38bdf8]"></span>
              位移的合成与分解
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              显示位置矢量 <strong className="font-mono text-sky-400">s⃗</strong> 与两轴分位移{' '}
              <span className="font-mono text-slate-300 font-semibold">s_x, s_y</span>
            </p>
          </div>
        </div>

        {/* Velocity Vector (3D tactile card) */}
        <div
          onClick={() => toggleKey('showVelocity')}
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
            options.showVelocity
              ? 'bg-gradient-to-b from-rose-950 to-slate-900 border-2 border-rose-400 shadow-[0_4px_0_#be123c,inset_0_2px_4px_rgba(244,63,94,0.2),0_0_16px_rgba(244,63,94,0.25)] translate-y-0.5'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border-slate-700 shadow-[0_4px_0_#0f172a,0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#0f172a]'
          }`}
        >
          <input
            type="checkbox"
            checked={options.showVelocity}
            onChange={() => {}}
            className="mt-0.5 rounded text-rose-500 focus:ring-rose-400 w-4 h-4 pointer-events-none cursor-pointer accent-rose-500"
          />
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-100">
              <span className="w-2.5 h-1.5 bg-rose-400 rounded-xs shadow-[0_0_6px_#f43f5e]"></span>
              某一时刻速度的合成
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              显示瞬时合速度切线 <strong className="font-mono text-rose-400">v⃗</strong> 与分速度{' '}
              <span className="font-mono text-slate-300 font-semibold">v_x, v_y</span>
            </p>
          </div>
        </div>

        {/* Acceleration Vector (3D tactile card) */}
        <div
          onClick={() => toggleKey('showAcceleration')}
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
            options.showAcceleration
              ? 'bg-gradient-to-b from-amber-950 to-slate-900 border-2 border-amber-400 shadow-[0_4px_0_#b45309,inset_0_2px_4px_rgba(251,191,36,0.2),0_0_16px_rgba(251,191,36,0.25)] translate-y-0.5'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border-slate-700 shadow-[0_4px_0_#0f172a,0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#0f172a]'
          }`}
        >
          <input
            type="checkbox"
            checked={options.showAcceleration}
            onChange={() => {}}
            className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 w-4 h-4 pointer-events-none cursor-pointer accent-amber-500"
          />
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-100">
              <span className="w-2.5 h-1.5 bg-amber-400 rounded-xs shadow-[0_0_6px_#fbbf24]"></span>
              加速度的合成与分解
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              显示合加速度 <strong className="font-mono text-amber-400">a⃗</strong> 与两轴分加速度{' '}
              <span className="font-mono text-slate-300 font-semibold">a_x, a_y</span>
            </p>
          </div>
        </div>
      </div>

      {/* Auxiliary Display Options: Parallelogram, Trajectory, Strobe */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800">
        {/* Parallelogram rule */}
        <label
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
            options.showParallelogram
              ? 'bg-slate-850 border-blue-500/60 text-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <input
            type="checkbox"
            checked={options.showParallelogram}
            onChange={() => toggleKey('showParallelogram')}
            className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 cursor-pointer accent-blue-500"
          />
          <div className="flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold">平行四边形定则辅助线</span>
          </div>
        </label>

        {/* Trajectory Curve */}
        <label
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
            options.showTrajectory
              ? 'bg-slate-850 border-cyan-500/60 text-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <input
            type="checkbox"
            checked={options.showTrajectory}
            onChange={() => toggleKey('showTrajectory')}
            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer accent-cyan-500"
          />
          <div className="flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold">合运动轨迹曲线</span>
          </div>
        </label>

        {/* Strobe */}
        <label
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
            options.showStrobe
              ? 'bg-slate-850 border-emerald-500/60 text-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <input
            type="checkbox"
            checked={options.showStrobe}
            onChange={() => toggleKey('showStrobe')}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
          />
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold">频闪打点痕迹 (0.5s)</span>
          </div>
        </label>
      </div>
    </div>
  );
};
