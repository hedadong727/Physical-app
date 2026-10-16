import React from 'react';
import { ObservationMode } from '../types/physics';
import { Layers, CheckCircle2, SplitSquareVertical } from 'lucide-react';

interface ObservationModeSelectorProps {
  observationMode: ObservationMode;
  onObservationModeChange: (mode: ObservationMode) => void;
  showProjections: boolean;
  onToggleProjections: (show: boolean) => void;
}

export const ObservationModeSelector: React.FC<ObservationModeSelectorProps> = ({
  observationMode,
  onObservationModeChange,
  showProjections,
  onToggleProjections,
}) => {
  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-3.5 text-slate-100">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.5)]">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-slate-100 text-sm tracking-tight">
            运动观察模式 (分运动与合运动切换)
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-bold font-mono">
          [ 模式单选 ]
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Combined Motion Button (3D tactile keycap) */}
        <button
          type="button"
          onClick={() => onObservationModeChange('both')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
            observationMode === 'both'
              ? 'bg-gradient-to-b from-blue-900/90 to-blue-950 border-2 border-blue-400 shadow-[0_4px_0_#1e40af,inset_0_2px_4px_rgba(37,99,235,0.3),0_0_16px_rgba(37,99,235,0.35)] text-white font-bold translate-y-0.5'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border-slate-700 text-slate-200 shadow-[0_4px_0_#0f172a,0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#0f172a]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="font-extrabold text-xs">
              同时参与两运动 (合运动)
            </span>
            {observationMode === 'both' && (
              <CheckCircle2 className="w-4 h-4 text-cyan-400 fill-cyan-950 shrink-0" />
            )}
          </div>
          <span className="text-[11px] text-slate-400 leading-tight">
            质点在直角坐标系中的实际运动轨迹
          </span>
        </button>

        {/* X Axis Only */}
        <button
          type="button"
          onClick={() => onObservationModeChange('only_x')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
            observationMode === 'only_x'
              ? 'bg-gradient-to-b from-emerald-900/90 to-emerald-950 border-2 border-emerald-400 shadow-[0_4px_0_#065f46,inset_0_2px_4px_rgba(16,185,129,0.3),0_0_16px_rgba(16,185,129,0.35)] text-white font-bold translate-y-0.5'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border-slate-700 text-slate-200 shadow-[0_4px_0_#0f172a,0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#0f172a]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="font-extrabold text-xs">
              仅在 X 轴上运动 (分运动 1)
            </span>
            {observationMode === 'only_x' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950 shrink-0" />
            )}
          </div>
          <span className="text-[11px] text-slate-400 leading-tight">
            水平方向独立分运动 (y 恒为 0)
          </span>
        </button>

        {/* Y Axis Only */}
        <button
          type="button"
          onClick={() => onObservationModeChange('only_y')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
            observationMode === 'only_y'
              ? 'bg-gradient-to-b from-amber-900/90 to-amber-950 border-2 border-amber-400 shadow-[0_4px_0_#92400e,inset_0_2px_4px_rgba(245,158,11,0.3),0_0_16px_rgba(245,158,11,0.35)] text-white font-bold translate-y-0.5'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border-slate-700 text-slate-200 shadow-[0_4px_0_#0f172a,0_2px_5px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#0f172a]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="font-extrabold text-xs">
              仅在 Y 轴上运动 (分运动 2)
            </span>
            {observationMode === 'only_y' && (
              <CheckCircle2 className="w-4 h-4 text-amber-400 fill-amber-950 shrink-0" />
            )}
          </div>
          <span className="text-[11px] text-slate-400 leading-tight">
            竖直方向独立分运动 (x 恒为 0)
          </span>
        </button>
      </div>

      {/* 合运动专属：两坐标轴投影小球开关 (三球联动) */}
      {observationMode === 'both' && (
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">
              三球联动：在坐标轴上实时显示 X 和 Y 分运动投影小球
            </span>
            <span className="text-[10px] bg-blue-900/60 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-blue-500/40">
              教学重点
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showProjections}
              onChange={(e) => onToggleProjections(e.target.checked)}
              className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-300">
              开启轴上投影及虚线矩形
            </span>
          </label>
        </div>
      )}
    </div>
  );
};
