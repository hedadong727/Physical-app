import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AxisMotionConfig,
  ObservationMode,
  VectorDisplayOptions,
  PhysicsPreset,
} from './types/physics';
import {
  calculateState,
  analyzeMotion,
  PHYSICS_PRESETS,
} from './utils/physicsEngine';
import { CoordinateCanvas } from './components/CoordinateCanvas';
import { AxisControlPanel } from './components/AxisControlPanel';
import { PlaybackControls } from './components/PlaybackControls';
import { PresetBar } from './components/PresetBar';
import { PhysicsDataBoard } from './components/PhysicsDataBoard';
import { PublishModal } from './components/PublishModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { ExperimentReportData } from './services/googleDrive';
import { initAuth, getCurrentUser } from './services/googleAuth';
import { User } from 'firebase/auth';
import { Atom, SlidersHorizontal, Activity, Share2, Download, Laptop, Cloud, HardDrive } from 'lucide-react';

export default function App() {
  // PWA & Deploy Modal State
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  // Preset selection (default to Horizontal Projectile: classic high school model)
  const defaultPreset = PHYSICS_PRESETS[0];
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(defaultPreset.id);

  // Motion Configuration
  const [xConfig, setXConfig] = useState<AxisMotionConfig>(defaultPreset.xConfig);
  const [yConfig, setYConfig] = useState<AxisMotionConfig>(defaultPreset.yConfig);
  const [observationMode, setObservationMode] = useState<ObservationMode>(
    defaultPreset.observationMode
  );

  // Vector Display Options
  const [vectorOptions, setVectorOptions] = useState<VectorDisplayOptions>({
    showDisplacement: true,
    showVelocity: true,
    showAcceleration: true,
    showParallelogram: true,
    showProjections: true,
    showTrajectory: true,
    showStrobe: false,
    strobeInterval: 0.5,
  });

  // Time & Playback
  const [duration, setDuration] = useState<number>(defaultPreset.duration);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [loop, setLoop] = useState<boolean>(true);

  // Reference for requestAnimationFrame
  const lastTimestampRef = useRef<number | null>(null);

  const [activeModelType, setActiveModelType] = useState<string | null>(defaultPreset.id);

  // Load a preset
  const handleSelectPreset = (preset: PhysicsPreset) => {
    setCurrentPresetId(preset.id);
    setActiveModelType(preset.id);
    setXConfig(preset.xConfig);
    setYConfig(preset.yConfig);
    setObservationMode(preset.observationMode);
    setDuration(preset.duration);
    setCurrentTime(0);
    setIsPlaying(true);
    if (preset.vectorOptions) {
      setVectorOptions((prev) => ({
        ...prev,
        ...preset.vectorOptions,
      }));
    }
  };

  // When user modifies axes manually, clear preset ID but keep active model context
  const handleXConfigChange = (cfg: AxisMotionConfig) => {
    setCurrentPresetId(null);
    setXConfig(cfg);
  };

  const handleYConfigChange = (cfg: AxisMotionConfig) => {
    setCurrentPresetId(null);
    setYConfig(cfg);
  };

  const handleObservationModeChange = (mode: ObservationMode) => {
    setObservationMode(mode);
  };

  // Google Drive Modal & Auth State
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentUser());

  useEffect(() => {
    const unsubscribe = initAuth(
      (u) => setGoogleUser(u),
      () => setGoogleUser(getCurrentUser())
    );
    return () => unsubscribe();
  }, []);

  // Load saved experiment from Google Drive
  const handleLoadExperimentFromDrive = (savedData: ExperimentReportData) => {
    if (savedData.presetName) {
      const match = PHYSICS_PRESETS.find((p) => p.name === savedData.presetName);
      if (match) setCurrentPresetId(match.id);
      else setCurrentPresetId(null);
    } else {
      setCurrentPresetId(null);
    }
    setXConfig(savedData.xConfig);
    setYConfig(savedData.yConfig);
    setObservationMode(savedData.observationMode);
    if (savedData.vectorOptions) {
      setVectorOptions(savedData.vectorOptions);
    }
    setDuration(savedData.duration || 4.0);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Animation Loop via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      return;
    }

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prevTime) => {
        const nextTime = prevTime + deltaSeconds * playbackSpeed;
        if (nextTime >= duration) {
          if (loop) {
            return 0;
          } else {
            setIsPlaying(false);
            return duration;
          }
        }
        return nextTime;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, duration, playbackSpeed, loop]);

  // Keyboard Shortcuts (Space for Play/Pause, Arrow keys for step, R for reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime((t) => Math.min(duration, t + 0.05));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime((t) => Math.max(0, t - 0.05));
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setCurrentTime(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration]);

  // Derived current state & theoretical analysis
  const currentState = useMemo(() => {
    return calculateState(currentTime, xConfig, yConfig, observationMode);
  }, [currentTime, xConfig, yConfig, observationMode]);

  const analysis = useMemo(() => {
    return analyzeMotion(xConfig, yConfig, observationMode);
  }, [xConfig, yConfig, observationMode]);

  const currentPreset = useMemo(() => {
    return PHYSICS_PRESETS.find((p) => p.id === currentPresetId);
  }, [currentPresetId]);

  const isRiverCrossing =
    currentPresetId === 'river-crossing' ||
    activeModelType === 'river-crossing' ||
    (currentPreset?.id === 'river-crossing');

  return (
    <div className="min-h-screen bg-tech-grid text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] border-t border-blue-300">
              <Atom className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                运动的合成与分解演示实验室
                <span className="text-[11px] font-bold text-cyan-300 bg-blue-950/80 border border-blue-700/60 px-2 py-0.5 rounded-full shadow-xs">
                  高中物理必修二
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                直角坐标系分运动与合运动动态仿真 · 矢量合成与分解 · 轨迹解析
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="hidden lg:flex items-center gap-2">
              <span className="font-mono bg-black/60 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 shadow-xs font-bold">Space</span> 播放/暂停
              <span className="font-mono bg-black/60 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 shadow-xs font-bold">← / →</span> 单帧步进
              <span className="font-mono bg-black/60 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 shadow-xs font-bold">R</span> 复位
            </div>

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-[0_2px_0_#312e81,0_2px_6px_rgba(99,102,241,0.35)] active:translate-y-0.5 cursor-pointer"
                title="安装为独立电脑桌面程序 (免浏览器全屏，支持断网离线)"
              >
                <Laptop className="w-3.5 h-3.5 text-cyan-300" />
                <span>安装到桌面</span>
              </button>
            )}

            {/* Google Drive Archive Button */}
            <button
              type="button"
              onClick={() => setShowDriveModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs active:translate-y-0.5 transition-all cursor-pointer border ${
                googleUser
                  ? 'bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 text-white border-blue-400/60 shadow-[0_2px_0_#1e3a8a,0_2px_8px_rgba(37,99,235,0.4)]'
                  : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 border-slate-700 shadow-[0_2px_0_#0f172a]'
              }`}
              title="Google 云端硬盘实验档案库 (备份实验参数、保存高清轨迹、跨设备载入)"
            >
              <Cloud className={`w-3.5 h-3.5 ${googleUser ? 'text-cyan-300' : 'text-slate-400'}`} />
              <span>{googleUser ? '云端硬盘 (已连)' : 'Google 云端硬盘'}</span>
              {googleUser && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-extrabold text-xs shadow-[0_2px_0_#064e3b,0_2px_8px_rgba(16,185,129,0.4)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer border-t border-emerald-400/50"
              title="查看跨电脑运行方法、公网直达链接、离线单机包与扫码方式"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>跨设备运行/发布</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Presets Bar (一键加载典型教学模型) */}
        <PresetBar
          currentPresetId={currentPresetId}
          onSelectPreset={handleSelectPreset}
        />

        {/* 1. 主演示模块 (Hero Demonstration Stage) */}
        <div className="space-y-3.5">
          {/* 直角坐标系大屏屏幕外框 (科技屏幕外框，高保真示波器/实验显示器质感) */}
          <section className="h-[520px] w-full">
            <CoordinateCanvas
              xConfig={xConfig}
              yConfig={yConfig}
              observationMode={observationMode}
              onObservationModeChange={handleObservationModeChange}
              vectorOptions={vectorOptions}
              onVectorOptionsChange={setVectorOptions}
              currentTime={currentTime}
              duration={duration}
              onTimeChange={(t) => {
                setIsPlaying(false);
                setCurrentTime(t);
              }}
              currentState={currentState}
              currentPresetId={currentPresetId}
              currentPresetName={currentPreset?.name}
              isRiverCrossingModel={isRiverCrossing}
              onOpenDriveModal={() => setShowDriveModal(true)}
            />
          </section>

          {/* 演示模块时间与播放控制栏 (立体实体控制台，时间与时长格外清晰醒目) */}
          <section>
            <PlaybackControls
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onReset={() => {
                setCurrentTime(0);
                setIsPlaying(false);
              }}
              onStepForward={() => {
                setIsPlaying(false);
                setCurrentTime((t) => Math.min(duration, t + 0.05));
              }}
              onStepBackward={() => {
                setIsPlaying(false);
                setCurrentTime((t) => Math.max(0, t - 0.05));
              }}
              currentTime={currentTime}
              duration={duration}
              onTimeChange={(t) => {
                setIsPlaying(false);
                setCurrentTime(t);
              }}
              playbackSpeed={playbackSpeed}
              onPlaybackSpeedChange={setPlaybackSpeed}
              loop={loop}
              onToggleLoop={() => setLoop((l) => !l)}
              onDurationChange={(d) => {
                setDuration(d);
                if (currentTime > d) setCurrentTime(d);
              }}
            />
          </section>
        </div>

        {/* 3. 详细参数调节与物理推导面板区 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pt-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-extrabold text-slate-100">
              坐标轴运动学参数调节 & 物理量定量分析与推导
            </h2>
          </div>

          {/* X轴与Y轴初速度/加速度设置面板 */}
          <AxisControlPanel
            xConfig={xConfig}
            yConfig={yConfig}
            onXConfigChange={handleXConfigChange}
            onYConfigChange={handleYConfigChange}
          />

          {/* 实时物理量定量分析、运动性质判据、轨迹方程与三大原理 */}
          <PhysicsDataBoard
            currentState={currentState}
            analysis={analysis}
            currentPreset={currentPreset}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-4 mt-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>运动的合成与分解可视化仿真教学实验平台 · 符合高中物理课程标准</span>
          <span className="text-slate-500 font-mono">独立性 · 等时性 · 等效性 (平行四边形定则)</span>
        </div>
      </footer>

      {/* Cross-Computer Publish & Offline Deploy Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallPwa={handleInstallPwa}
      />

      {/* Google Drive Cloud Experiment Archive Modal */}
      <GoogleDriveModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        xConfig={xConfig}
        yConfig={yConfig}
        observationMode={observationMode}
        vectorOptions={vectorOptions}
        duration={duration}
        currentTime={currentTime}
        currentState={currentState}
        analysis={analysis}
        currentPreset={currentPreset}
        onLoadExperiment={handleLoadExperimentFromDrive}
      />
    </div>
  );
}
