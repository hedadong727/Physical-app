import React from 'react';
import { AxisMotionConfig } from '../types/physics';
import { MoveRight, MoveUp } from 'lucide-react';

interface AxisControlPanelProps {
  xConfig: AxisMotionConfig;
  yConfig: AxisMotionConfig;
  onXConfigChange: (cfg: AxisMotionConfig) => void;
  onYConfigChange: (cfg: AxisMotionConfig) => void;
}

export const AxisControlPanel: React.FC<AxisControlPanelProps> = ({
  xConfig,
  yConfig,
  onXConfigChange,
  onYConfigChange,
}) => {
  const renderAxisSection = (
    axisName: 'X' | 'Y',
    icon: React.ReactNode,
    config: AxisMotionConfig,
    onChange: (cfg: AxisMotionConfig) => void,
    headerColor: string,
    accentGlow: string
  ) => {
    return (
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-4 text-slate-100">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl ${headerColor} text-white shadow-md ${accentGlow}`}>
              {icon}
            </span>
            <div>
              <h3 className="font-extrabold text-slate-100 text-sm tracking-tight">
                {axisName} 轴运动参数设置
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {axisName === 'X' ? '水平方向物理量 (初速度、加速度)' : '竖直方向物理量 (初速度、加速度)'}
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-cyan-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {axisName}-CHANNEL
          </span>
        </div>

        {/* Motion Kind Selector (3D tactile keyboard caps) */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            运动形式选择
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/60 rounded-xl border border-slate-800 shadow-inner text-xs">
            <button
              type="button"
              onClick={() => onChange({ ...config, kind: 'rest', a: 0 })}
              className={`py-2 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                config.kind === 'rest'
                  ? 'bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-[0_2px_6px_rgba(0,0,0,0.6)] border-t border-slate-500'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:shadow-none border border-slate-700'
              }`}
            >
              静止
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...config, kind: 'uniform', a: 0 })}
              className={`py-2 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                config.kind === 'uniform'
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(37,99,235,0.5)] border-t border-blue-400'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:shadow-none border border-slate-700'
              }`}
            >
              匀速直线
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...config, kind: 'uniform_accel' })}
              className={`py-2 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                config.kind === 'uniform_accel'
                  ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-[0_2px_8px_rgba(79,70,229,0.5)] border-t border-indigo-400'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:shadow-none border border-slate-700'
              }`}
            >
              匀加速直线
            </button>
          </div>
        </div>

        {/* Parameters */}
        {config.kind === 'rest' ? (
          <div className="py-7 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 shadow-inner font-medium">
            {axisName} 轴方向保持静止 (v₀ = 0 m/s, a = 0 m/s²)
          </div>
        ) : (
          <div className="space-y-4 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shadow-inner">
            {/* Velocity control */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                <span className="text-slate-300">
                  {config.kind === 'uniform' ? '匀速直线运动速度 (v)' : '匀变速直线运动初速度 (v₀)'}:
                </span>
                <span className="font-mono text-cyan-400 text-sm font-extrabold bg-black/60 px-2 py-0.5 rounded border border-slate-700">
                  {config.v0.toFixed(1)} m/s
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={config.v0}
                onChange={(e) => onChange({ ...config, v0: parseFloat(e.target.value) })}
                className="w-full tactile-range cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>-20 m/s</span>
                <span>0</span>
                <span>+20 m/s</span>
              </div>
            </div>

            {/* Acceleration control (only for uniform_accel) */}
            {config.kind === 'uniform_accel' && (
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                  <span className="text-slate-300">加速度 (a):</span>
                  <span className="font-mono text-amber-400 text-sm font-extrabold bg-black/60 px-2 py-0.5 rounded border border-slate-700">
                    {config.a.toFixed(1)} m/s²
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.5"
                  value={config.a}
                  onChange={(e) => onChange({ ...config, a: parseFloat(e.target.value) })}
                  className="w-full tactile-range cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>-20 m/s²</span>
                  <span>0</span>
                  <span>+20 m/s²</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* X Axis Column */}
      {renderAxisSection(
        'X',
        <MoveRight className="w-5 h-5" />,
        xConfig,
        onXConfigChange,
        'bg-blue-600',
        'shadow-[0_2px_8px_rgba(37,99,235,0.4)]'
      )}

      {/* Y Axis Column */}
      {renderAxisSection(
        'Y',
        <MoveUp className="w-5 h-5" />,
        yConfig,
        onYConfigChange,
        'bg-indigo-600',
        'shadow-[0_2px_8px_rgba(79,70,229,0.4)]'
      )}
    </div>
  );
};
