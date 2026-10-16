import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Repeat,
  Gauge,
  Clock,
  Timer,
} from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  currentTime: number;
  duration: number;
  onTimeChange: (time: number) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  onDurationChange: (duration: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  onStepForward,
  onStepBackward,
  currentTime,
  duration,
  onTimeChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  loop,
  onToggleLoop,
  onDurationChange,
}) => {
  return (
    <div className="w-full space-y-3.5 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] text-slate-100">
      {/* 
        突出显示：实验时间轴 t 与 演示总时长 (高精 OLED 黑色沉金仪器指示面板)
      */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-black/70 border border-slate-800 rounded-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.06)]">
        {/* 实验时间轴 t */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-b from-slate-900 to-black border border-emerald-900/80 rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.8),0_0_12px_rgba(16,185,129,0.15)]">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-xs text-slate-300">实验时间轴 t :</span>
            <span className="font-mono font-extrabold text-emerald-400 text-lg tracking-wider">
              {currentTime.toFixed(2)}
            </span>
            <span className="text-emerald-500 font-bold text-xs">s</span>
          </div>

          <div className="text-xs text-slate-400 font-mono font-bold">
            / {duration.toFixed(1)} s
          </div>
        </div>

        {/* 演示总时长选择器 (立体金属质感按键旋钮) */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
          <Timer className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300">演示总时长:</span>
          <select
            value={duration}
            onChange={(e) => onDurationChange(parseFloat(e.target.value))}
            className="text-xs font-mono font-bold bg-slate-900 text-cyan-300 border border-slate-600 rounded-md px-2.5 py-1 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer shadow-[0_2px_0_#0f172a] hover:border-cyan-400 transition-all"
          >
            <option value={2}>2.0 s (快速)</option>
            <option value={3}>3.0 s (标准)</option>
            <option value={4}>4.0 s</option>
            <option value={5}>5.0 s (舒缓演示)</option>
            <option value={8}>8.0 s (详细观察)</option>
            <option value={10}>10.0 s</option>
          </select>
        </div>
      </div>

      {/* 连续时间轴拖拽滑块 (实体刻度凹槽与高亮旋钮) */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]">
        <div className="relative flex items-center mb-1.5 px-0.5">
          <input
            type="range"
            min="0"
            max={duration}
            step="0.02"
            value={currentTime}
            onChange={(e) => onTimeChange(parseFloat(e.target.value))}
            className="w-full tactile-range cursor-pointer"
            title="拖动滑块查看任意瞬时状态"
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-400 font-mono px-1 font-semibold">
          <span>0.00 s (起始)</span>
          <span className="text-cyan-400 font-bold">{(duration * 0.5).toFixed(2)} s (中点)</span>
          <span>{duration.toFixed(2)} s (终点)</span>
        </div>
      </div>

      {/* 按钮控制操作栏 (立体质感琴键式推按按钮) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* 播放控制核心按钮组 */}
        <div className="flex items-center gap-2.5">
          {/* 复位按钮 (3D 机械按键) */}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-slate-200 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 rounded-xl transition-all border border-slate-600 shadow-[0_3px_0_#1e293b,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none cursor-pointer text-xs font-bold"
            title="重置到初始状态 t = 0 (按 R 键)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
            <span>复位</span>
          </button>

          {/* 单帧后退 (3D 机械按键) */}
          <button
            type="button"
            onClick={onStepBackward}
            className="flex items-center gap-1 px-3 py-2 text-slate-200 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 rounded-xl transition-all border border-slate-600 shadow-[0_3px_0_#1e293b,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none cursor-pointer text-xs font-bold font-mono"
            title="单帧后退 -0.05s (按 ← 箭头键)"
          >
            <SkipBack className="w-3.5 h-3.5 text-slate-300" />
            <span>-0.05s</span>
          </button>

          {/* 3D 播放/暂停 核心主按键 (立体凸起开关) */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-7 py-2.5 rounded-xl font-extrabold text-xs text-white transition-all cursor-pointer ${
              isPlaying
                ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 shadow-[0_4px_0_#92400e,0_8px_16px_rgba(217,119,6,0.4)] active:translate-y-1 active:shadow-[0_1px_0_#92400e] border-t border-amber-300/60'
                : 'bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-[0_4px_0_#1e40af,0_8px_16px_rgba(37,99,235,0.45)] active:translate-y-1 active:shadow-[0_1px_0_#1e40af] border-t border-blue-300/60'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>暂停 (空格键)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>播放演示 (空格键)</span>
              </>
            )}
          </button>

          {/* 单帧前进 (3D 机械按键) */}
          <button
            type="button"
            onClick={onStepForward}
            className="flex items-center gap-1 px-3 py-2 text-slate-200 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 rounded-xl transition-all border border-slate-600 shadow-[0_3px_0_#1e293b,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none cursor-pointer text-xs font-bold font-mono"
            title="单帧步进 +0.05s (按 → 箭头键)"
          >
            <SkipForward className="w-3.5 h-3.5 text-slate-300" />
            <span>+0.05s</span>
          </button>
        </div>

        {/* 倍速与循环开关 (立体控制台凹槽与发光键帽) */}
        <div className="flex items-center gap-3">
          {/* 播放倍速键轴 */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-slate-700/80 shadow-inner text-xs">
            <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {[0.25, 0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onPlaybackSpeedChange(spd)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_2px_6px_rgba(37,99,235,0.5)] border-t border-blue-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.2)]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* 循环播放开关 (3D 弹簧开关) */}
          <button
            type="button"
            onClick={onToggleLoop}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all cursor-pointer text-xs font-bold ${
              loop
                ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-blue-500 shadow-[0_3px_0_#1e40af,0_4px_10px_rgba(37,99,235,0.3)] active:translate-y-0.5 active:shadow-[0_1px_0_#1e40af]'
                : 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-300 border-slate-600 shadow-[0_3px_0_#1e293b,0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:shadow-none'
            }`}
            title="是否循环回放"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>循环播放</span>
          </button>
        </div>
      </div>
    </div>
  );
};
