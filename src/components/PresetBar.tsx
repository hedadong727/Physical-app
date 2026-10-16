import React from 'react';
import { PHYSICS_PRESETS } from '../utils/physicsEngine';
import { PhysicsPreset } from '../types/physics';
import { BookOpen, Sparkles } from 'lucide-react';

interface PresetBarProps {
  currentPresetId: string | null;
  onSelectPreset: (preset: PhysicsPreset) => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  currentPresetId,
  onSelectPreset,
}) => {
  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] text-slate-100">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.5)]">
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-extrabold text-slate-100 text-xs tracking-tight">
          高中物理典型经典模型快速加载 (人教版必修二 / 高考常考体系)
        </h3>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
        {PHYSICS_PRESETS.map((preset) => {
          const isSelected = currentPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 text-white shadow-[0_3px_0_#1e40af,0_0_16px_rgba(37,99,235,0.4)] border-t border-blue-400 translate-y-0.5'
                  : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-slate-200 border border-slate-700 shadow-[0_3px_0_#0f172a,0_2px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#0f172a] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none'
              }`}
            >
              {isSelected && <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin-slow" />}
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
