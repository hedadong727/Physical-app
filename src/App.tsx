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
import {
  Atom,
  SlidersHorizontal,
  Activity,
  Share2,
  Download,
  Laptop,
  Cloud,
  HardDrive,
  Minus,
  Square,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Native Window Application Mode & Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [hidePromptBanner, setHidePromptBanner] = useState<boolean>(false);

  // Listen to Fullscreen change to keep maximize/restore button in sync
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request error:', err);
    }
  };

  const handleCloseApp = () => {
    try {
      window.close();
    } catch {
      // ignore
    }
    setTimeout(() => {
      setShowCloseModal(true);
    }, 80);
  };

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
      {/* 1. 顶层原生独立应用窗口控制栏 (Native Window Titlebar · 像普通桌面软件一样只有三个按钮) */}
      <div className="bg-slate-950 border-b border-slate-800/90 text-slate-300 text-xs px-3 py-1 flex items-center justify-between select-none z-30 shadow-md">
        {/* Left: Window Icon + App Title */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            ⚛
          </div>
          <span className="font-semibold text-slate-200 tracking-wide text-xs">
            运动的合成与分解演示实验室
          </span>
          <span className="hidden sm:inline-block text-[10px] font-bold text-cyan-400 bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.2 rounded">
            高中物理必修二
          </span>
          {isFullscreen ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              独立应用运行中 (已隐藏浏览器地址栏与工具栏)
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-mono">
              独立应用窗口模式
            </span>
          )}
        </div>

        {/* Center: Fullscreen / Hide Toolbar Guide Pill */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="hidden lg:flex items-center gap-1.5 text-[11px] text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900/70 border border-cyan-700/50 px-2.5 py-0.5 rounded-full transition-all cursor-pointer shadow-xs"
            title="点击隐藏浏览器工具栏与地址栏，进入独立应用全屏模式"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>点击右上角「□」或此处，隐藏浏览器工具栏与地址栏</span>
          </button>
        )}

        {/* Right: The 3 Classic Window Control Buttons (上面只有三个按钮：最小化、最大化/全屏、关闭) */}
        <div className="flex items-center gap-0.5 border-l border-slate-800/80 pl-2">
          {/* 1. 最小化 / 紧凑模式按钮 */}
          <button
            type="button"
            onClick={() => setIsCompactMode((prev) => !prev)}
            className="w-10 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer"
            title={
              isCompactMode
                ? '还原界面 (展开下方参数设置面板)'
                : '最小化/紧凑模式 (折叠下方参数面板，最大化主实验舞台)'
            }
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* 2. 最大化 / 全屏独立应用模式 (隐藏浏览器地址栏与工具栏) */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`w-10 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
              isFullscreen
                ? 'text-cyan-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700'
            }`}
            title={
              isFullscreen
                ? '还原窗口 (退出全屏应用模式)'
                : '最大化独立应用窗口 (隐藏浏览器地址栏与工具栏)'
            }
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Square className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>

          {/* 3. 关闭按钮 (原生桌面红色高亮关闭键) */}
          <button
            type="button"
            onClick={handleCloseApp}
            className="w-10 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-red-600 active:bg-red-700 transition-colors cursor-pointer"
            title="关闭应用程序 / 退出演示"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. 隐藏浏览器栏提示条 (若未全屏则提示用户一键隐藏) */}
      {!isFullscreen && !hidePromptBanner && (
        <div className="bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border-b border-blue-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
            <span className="leading-snug">
              <strong className="text-white font-bold">💡 独立应用程序运行模式：</strong>
              打开程序后，只需点击右上角{' '}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="text-cyan-300 font-mono font-bold bg-blue-900/80 px-1.5 py-0.5 rounded border border-blue-600/60 inline-flex items-center gap-1 cursor-pointer hover:bg-blue-800"
              >
                <Square className="w-3 h-3 inline" /> 最大化
              </button>{' '}
              按钮，即可自动隐藏浏览器的工具栏与地址栏，像普通桌面程序一样纯净运行！
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="px-3 py-1 rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-extrabold text-xs shadow-[0_2px_0_#1d4ed8] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>立即隐藏浏览器栏 (全屏应用)</span>
            </button>
            <button
              type="button"
              onClick={() => setHidePromptBanner(true)}
              className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              title="暂时关闭提示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Application Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] border-t border-blue-300">
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
          <section
            className={`${
              isCompactMode ? 'h-[640px]' : 'h-[520px]'
            } w-full transition-all duration-300`}
          >
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
        {isCompactMode ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-400 shadow-inner">
            <div className="flex items-center gap-2 text-cyan-300 font-medium">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                详细参数调节与物理量定量面板已最小化收起（当前为大屏主舞台模式，享受更大演示视野）
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCompactMode(false)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs shadow-xs active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>展开参数面板</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-extrabold text-slate-100">
                  坐标轴运动学参数调节 & 物理量定量分析与推导
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCompactMode(true)}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                title="最小化收起参数面板，最大化实验舞台"
              >
                <span>收起参数</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
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
        )}
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

      {/* Close / Exit Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">退出演示实验室</h3>
                <p className="text-xs text-slate-400">您点击了右上角独立应用关闭按钮</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              若您运行在独立应用窗口（PWA 或 Windows 本地启动脚本），系统已尝试关闭窗口；若运行在普通浏览器标签页，您可以点击下方按钮退出全屏，或直接关闭该标签页。
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  try {
                    window.open('', '_self');
                    window.close();
                  } catch {
                    // ignore
                  }
                  setShowCloseModal(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow transition-all cursor-pointer text-center"
              >
                确认退出 / 关闭窗口
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentTime(0);
                  setIsPlaying(false);
                  setShowCloseModal(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer text-center"
              >
                复位物理实验
              </button>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-all cursor-pointer text-center"
              >
                返回实验
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
