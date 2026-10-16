import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logout,
  getAccessToken,
  getCurrentUser,
  initAuth,
} from '../services/googleAuth';
import {
  saveExperimentToDrive,
  listExperimentFiles,
  getExperimentFileContent,
  deleteDriveFile,
  DriveFileItem,
  ExperimentReportData,
  APP_DRIVE_FOLDER_NAME,
} from '../services/googleDrive';
import {
  AxisMotionConfig,
  ObservationMode,
  VectorDisplayOptions,
  InstantaneousState,
  MotionAnalysis,
  PhysicsPreset,
} from '../types/physics';
import {
  Cloud,
  HardDrive,
  LogOut,
  Save,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  FileImage,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current app state to save
  xConfig: AxisMotionConfig;
  yConfig: AxisMotionConfig;
  observationMode: ObservationMode;
  vectorOptions: VectorDisplayOptions;
  duration: number;
  currentTime: number;
  currentState: InstantaneousState;
  analysis: MotionAnalysis;
  currentPreset?: PhysicsPreset;
  // Callback when user restores an experiment from Drive
  onLoadExperiment: (savedData: ExperimentReportData) => void;
  // Optional image blob generator callback
  getSnapshotBlob?: () => Promise<Blob | null>;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  xConfig,
  yConfig,
  observationMode,
  vectorOptions,
  duration,
  currentTime,
  currentState,
  analysis,
  currentPreset,
  onLoadExperiment,
  getSnapshotBlob,
}) => {
  // Auth State
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tabs: 'save' | 'browse'
  const [activeTab, setActiveTab] = useState<'save' | 'browse'>('save');

  // Save Form State
  const [reportTitle, setReportTitle] = useState<string>('');
  const [teachingNotes, setTeachingNotes] = useState<string>('');
  const [includeSnapshot, setIncludeSnapshot] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<{
    reportFile: DriveFileItem;
    imageFile?: DriveFileItem;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Browse State
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  // Destructive Action: Confirmation Modal State
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        // Token cleared or logged out
        setUser(getCurrentUser());
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Set default report title whenever modal opens or preset changes
  useEffect(() => {
    if (isOpen) {
      const dateStr = new Date().toISOString().slice(0, 10);
      const presetName = currentPreset?.name || '自定义二维运动';
      setReportTitle(`物理实验_${presetName}_${dateStr}`);
      setSaveSuccess(null);
      setSaveError(null);
    }
  }, [isOpen, currentPreset]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        // Automatically fetch files if in browse tab
        if (activeTab === 'browse') {
          fetchDriveFiles(res.accessToken);
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err.message || 'Google 账号登录失败，请检查网络或授权配置');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setDriveFiles([]);
      setSaveSuccess(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Fetch Drive Files
  const fetchDriveFiles = useCallback(async (authToken?: string) => {
    const activeAccessToken = authToken || (await getAccessToken()) || token;
    if (!activeAccessToken) return;

    setIsLoadingFiles(true);
    setBrowseError(null);
    try {
      const files = await listExperimentFiles(activeAccessToken);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Failed to fetch files from Drive:', err);
      setBrowseError(err.message || '获取 Google 云端硬盘文件失败');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [token]);

  // When switching to Browse tab, fetch files if authenticated
  useEffect(() => {
    if (isOpen && activeTab === 'browse' && (token || user)) {
      fetchDriveFiles();
    }
  }, [isOpen, activeTab, token, user, fetchDriveFiles]);

  // Save Current Experiment to Drive
  const handleSaveToDrive = async () => {
    let activeToken = token;
    if (!activeToken) {
      try {
        const loginRes = await googleSignIn();
        if (!loginRes) return;
        activeToken = loginRes.accessToken;
        setUser(loginRes.user);
        setToken(loginRes.accessToken);
      } catch (err: any) {
        setSaveError(err.message || '请先登录 Google 账号以访问云端硬盘');
        return;
      }
    }

    if (!activeToken) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      let snapshotBlob: Blob | null = null;
      if (includeSnapshot && getSnapshotBlob) {
        try {
          snapshotBlob = await getSnapshotBlob();
        } catch {
          console.warn('Failed to generate snapshot blob, continuing without image');
        }
      }

      const reportData: ExperimentReportData = {
        title: reportTitle.trim() || `物理实验_${new Date().toISOString().slice(0, 10)}`,
        timestamp: new Date().toISOString(),
        presetName: currentPreset?.name,
        notes: teachingNotes.trim(),
        xConfig,
        yConfig,
        observationMode,
        vectorOptions,
        duration,
        currentTime,
        instantaneousState: currentState,
        motionAnalysis: analysis,
        appVersion: '1.0.0',
      };

      const result = await saveExperimentToDrive({
        data: reportData,
        accessToken: activeToken,
        imageBlob: snapshotBlob,
      });

      setSaveSuccess(result);
    } catch (err: any) {
      console.error('Failed to save to Drive:', err);
      setSaveError(err.message || '保存至 Google 云端硬盘失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Load and apply experiment from Drive
  const handleApplyExperiment = async (file: DriveFileItem) => {
    const activeToken = token || (await getAccessToken());
    if (!activeToken) return;

    setLoadingFileId(file.id);
    try {
      const data = await getExperimentFileContent(file.id, activeToken);
      onLoadExperiment(data);
      onClose();
    } catch (err: any) {
      alert(`无法载入实验: ${err.message || '解析文件失败'}`);
    } finally {
      setLoadingFileId(null);
    }
  };

  // Confirm delete handler (User Confirmation for Destructive Operations requirement)
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    const activeToken = token || (await getAccessToken());
    if (!activeToken) return;

    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id, activeToken);
      setDriveFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err: any) {
      alert(`删除失败: ${err.message || '网络错误'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.9)] border-2 border-slate-700/80 max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-emerald-500 to-blue-500 p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-sm tracking-tight flex items-center gap-2">
                Google 云端硬盘实验档案库 (Google Drive)
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  云端同步 · 教学课件存档
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                将物理仿真实验参数、教学备课讲义与轨迹图片安全备份至您的 Google 云端硬盘
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Auth Banner */}
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full border border-emerald-500/50 shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-700/80 text-white font-bold flex items-center justify-center text-sm border border-emerald-500">
                  {user.displayName?.[0] || user.email?.[0] || 'U'}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span>{user.displayName || 'Google 用户'}</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.2 rounded-full border border-emerald-800/60 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Drive 已连接
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {user.email}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-1">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-cyan-400" />
                <span>连接 Google 账号同步实验</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                经您授权后，实验数据与轨迹图片将保存在 Google 云端硬盘中专属的「<strong>{APP_DRIVE_FOLDER_NAME}</strong>」文件夹。
              </p>
            </div>
          )}

          <div>
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer transition-all"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>登出账号</span>
              </button>
            ) : (
              /* Official Google Sign-In Button style */
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button"
                style={{
                  backgroundColor: '#131314',
                  borderColor: '#8e918f',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  color: '#e3e3e3',
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                  fontFamily: 'Roboto, arial, sans-serif',
                  fontSize: '13px',
                  height: '38px',
                  letterSpacing: '0.25px',
                  outline: 'none',
                  overflow: 'hidden',
                  padding: '0 12px',
                  position: 'relative',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                  width: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ width: '18px', height: '18px', display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <span style={{ fontWeight: 600 }}>
                  {isLoggingIn ? '正在连接 Google...' : '使用 Google 账号登录'}
                </span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="p-3 bg-rose-950/80 border border-rose-700/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'save'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存当前实验到云端</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'browse'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>云端实验档案库 ({driveFiles.length})</span>
          </button>
        </div>

        {/* Tab 1: Save Experiment */}
        {activeTab === 'save' && (
          <div className="space-y-4">
            {/* Success Card */}
            {saveSuccess && (
              <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>已成功备份至 Google 云端硬盘！</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  文件已存放于 Google Drive 文件夹「<strong>{APP_DRIVE_FOLDER_NAME}</strong>」。您可以在其他电脑随时打开本应用登录账号一键载入。
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {saveSuccess.reportFile.webViewLink && (
                    <a
                      href={saveSuccess.reportFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>在 Google 云端硬盘中查看配置文件</span>
                    </a>
                  )}
                  {saveSuccess.imageFile?.webViewLink && (
                    <a
                      href={saveSuccess.imageFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      <span>查看轨迹图片</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {saveError && (
              <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Experiment Parameters Overview */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>当前要保存的仿真状态摘要:</span>
                <span className="font-mono text-cyan-400">
                  t = {currentTime.toFixed(2)}s / {duration.toFixed(1)}s
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">教学模型</div>
                  <div className="font-bold text-cyan-300 truncate">
                    {currentPreset?.name || '自定义运动'}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">X 轴分运动</div>
                  <div className="font-bold text-slate-200">
                    {xConfig.kind === 'uniform'
                      ? `匀速 v=${xConfig.v0}`
                      : xConfig.kind === 'uniform_accel'
                      ? `匀加 v0=${xConfig.v0}, a=${xConfig.a}`
                      : '静止'}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Y 轴分运动</div>
                  <div className="font-bold text-slate-200">
                    {yConfig.kind === 'uniform'
                      ? `匀速 v=${yConfig.v0}`
                      : yConfig.kind === 'uniform_accel'
                      ? `匀加 v0=${yConfig.v0}, a=${yConfig.a}`
                      : '静止'}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">运动性质判定</div>
                  <div className="font-bold text-emerald-400 truncate">
                    {analysis.motionTypeDesc}
                  </div>
                </div>
              </div>
            </div>

            {/* Title & Notes Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  实验存档标题 (文件名)
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="例如: 高中物理平抛运动实验课件_第3组"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  课堂教学反思与实验备注 (选填)
                </label>
                <textarea
                  value={teachingNotes}
                  onChange={(e) => setTeachingNotes(e.target.value)}
                  placeholder="可记录课堂思考题、学生提问、实验结论、分运动独立性推导等..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
                <input
                  type="checkbox"
                  id="includeSnapshotCheck"
                  checked={includeSnapshot}
                  onChange={(e) => setIncludeSnapshot(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 accent-emerald-500 cursor-pointer"
                />
                <label htmlFor="includeSnapshotCheck" className="text-slate-300 cursor-pointer select-none">
                  同时生成并上传当前高清晰度直角坐标系轨迹快照 (PNG 图片)
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveToDrive}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-extrabold text-xs shadow-[0_3px_0_#064e3b,0_4px_12px_rgba(16,185,129,0.4)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer border-t border-emerald-400/50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>正在上传至 Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-emerald-200" />
                    <span>保存实验至 Google 云端硬盘</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Browse & Restore Experiments */}
        {activeTab === 'browse' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Google Drive 目录: <strong>{APP_DRIVE_FOLDER_NAME}</strong></span>
              <button
                type="button"
                onClick={() => fetchDriveFiles()}
                disabled={isLoadingFiles}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                <span>刷新云端文件</span>
              </button>
            </div>

            {browseError && (
              <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{browseError}</span>
              </div>
            )}

            {!user ? (
              <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <Cloud className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">请先使用 Google 账号登录以查看您云端硬盘中的实验档案</p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  登录 Google 账号
                </button>
              </div>
            ) : isLoadingFiles ? (
              <div className="text-center py-12 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs text-slate-400">正在同步 Google 云端硬盘文件...</p>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">云端文件夹中暂无实验档案</p>
                <p className="text-[11px] text-slate-500">
                  切换到「保存当前实验到云端」选项卡，一键将当前运动模型备份至 Google Drive！
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {driveFiles.map((file) => {
                  const isJson = file.mimeType === 'application/json' || file.name.endsWith('.json');
                  const isImage = file.mimeType.startsWith('image/') || file.name.endsWith('.png');

                  return (
                    <div
                      key={file.id}
                      className="p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isJson
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                              : isImage
                              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isJson ? (
                            <FileJson className="w-4 h-4" />
                          ) : (
                            <FileImage className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                            <span>{new Date(file.createdTime).toLocaleString()}</span>
                            {file.size && (
                              <span>
                                {(parseInt(file.size, 10) / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isJson && (
                          <button
                            type="button"
                            onClick={() => handleApplyExperiment(file)}
                            disabled={loadingFileId === file.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs cursor-pointer transition-all"
                            title="将此实验的所有运动学参数加载到演示台"
                          >
                            {loadingFileId === file.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3 h-3" />
                            )}
                            <span>载入演示台</span>
                          </button>
                        )}

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            title="在 Google 云端硬盘中查看"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Delete button (opens confirmation modal) */}
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-800/60 cursor-pointer"
                          title="从 Google 云端硬盘中删除此文件"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mandatory User Confirmation Dialog for Destructive Operations */}
        {fileToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border-2 border-rose-600/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-[0_20px_50px_rgba(225,29,72,0.3)] animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 rounded-xl bg-rose-950 border border-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-100">确认从 Google 云端硬盘删除文件？</h4>
                  <p className="text-[11px] text-slate-400">此操作将永久移除该云端文件，无法撤销。</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 truncate">
                📄 {fileToDelete.name}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在删除...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>确认永久删除</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
