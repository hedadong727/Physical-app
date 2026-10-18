import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Laptop,
  Smartphone,
  HardDrive,
  WifiOff,
  ExternalLink,
  QrCode,
  Sparkles,
} from 'lucide-react';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallPwa: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallPwa,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  // The permanent public shared URL from Google AI Studio Cloud Run deployment
  const sharedUrl = 'https://ais-pre-5x6sxgdj73jkly2njfkbum-321231126027.europe-west2.run.app';

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-2 border-slate-700/80 max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0_2px_10px_rgba(37,99,235,0.5)]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-sm tracking-tight flex items-center gap-2">
                跨设备运行与离线发布中心
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  云端就绪 · 支持离线
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                支持在任何电脑（教室一体机/笔记本/白板）、手机或平板上免安装极速运行
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method 1: Instant Cloud Web Access (Recommended) */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-blue-500/40 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <span className="font-extrabold text-xs text-cyan-300">
                方案一：永久公网直达链接（最推荐 · 全平台免安装即开即用）
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              已发布上线
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            该程序已通过 Google Cloud Run 全球云端服务自动完成构建与部署。只要在<strong>任何一台电脑、电子白板或手机浏览器</strong>（Chrome / Edge / 微信 / 360 / Safari）中打开下方网址，即可立即使用全部功能：
          </p>

          <div className="flex items-center gap-2 bg-black/80 p-2 rounded-lg border border-slate-700">
            <input
              type="text"
              readOnly
              value={sharedUrl}
              className="bg-transparent text-xs text-cyan-200 font-mono w-full outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-600 text-white shadow-[0_2px_6px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-[0_2px_0_#1e3a8a]'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已复制网址！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制网址</span>
                </>
              )}
            </button>
            <a
              href={sharedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="在新标签页中打开测试"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* QR Code expansion for Mobile/Tablet */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 text-[11px]">
              支持在教室投影仪、黑板触摸屏、教师笔记本之间自由无缝切换。
            </span>
            <button
              type="button"
              onClick={() => setShowQrCode((s) => !s)}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer text-[11px]"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQrCode ? '收起二维码' : '查看手机扫码二维码'}</span>
            </button>
          </div>

          {showQrCode && (
            <div className="p-3 bg-white rounded-lg flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-150">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  sharedUrl
                )}`}
                alt="手机扫码访问二维码"
                className="w-36 h-36 border border-slate-200 rounded"
              />
              <span className="text-xs font-bold text-slate-800">
                使用手机或平板相机扫码，即刻在移动端体验仿真
              </span>
            </div>
          )}
        </div>

        {/* Method 2: PWA Desktop Standalone App (Offline Capable) */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/40 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <span className="font-extrabold text-xs text-indigo-300">
                方案二：安装为电脑桌面独立应用 (PWA 离线版 · 无浏览器边框)
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
              极力推荐课堂演示
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            程序已内置 <strong>Progressive Web App (PWA)</strong> 技术与离线缓存服务。在 Chrome 或 Edge 浏览器中打开时，可直接将其“安装”到 Windows 或 Mac 桌面上：
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-black/60 rounded-lg border border-slate-800 flex items-start gap-2">
              <Laptop className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">独立窗口全屏沉浸：</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  桌面双击启动，没有浏览器地址栏和标签页遮挡，宛如专业的物理仿真实验软件。
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-black/60 rounded-lg border border-slate-800 flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">脱机断网照样运行：</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  首次访问后自动缓存所有资源，即使教室没有网络连接，也能在电脑上秒开运行！
                </p>
              </div>
            </div>
          </div>

          {deferredPrompt && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onInstallPwa}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs shadow-[0_3px_0_#312e81,0_4px_10px_rgba(99,102,241,0.4)] active:translate-y-0.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>立即将本程序安装到电脑桌面</span>
              </button>
            </div>
          )}
        </div>

        {/* Method 3: USB Drive Portable Offline Bundle */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/40 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </span>
              <span className="font-extrabold text-xs text-amber-300">
                方案三：拷贝到 U 盘在任意 Windows 电脑离线运行（绿色单机包）
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
              已更新：Windows / 安卓平板 / 完整压缩包
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            已重新打包生成全部最新离线包，集成最新物理引擎、矢量标注及触控交互优化。提供三种不同平台的离线运行方案：
          </p>

          {/* Platform Specific Advice: Windows & Android Tablet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {/* Windows Box */}
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-1.5 leading-relaxed">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>💻 Windows 电脑 / 教室电子白板一体机：</span>
              </div>
              <div className="text-slate-300 text-[11px] space-y-1">
                <div>
                  • <strong>独立应用窗口模式 (无地址栏/工具栏)：</strong>解压下方 Windows 离线包，双击 <strong>「以独立应用窗口直接启动(无地址栏).bat」</strong> 或 <strong>「一键在Windows运行.bat」</strong>，自动隐藏浏览器地址栏与标签栏，顶部仅保留「最小化、最大化、关闭」三按钮！
                </div>
                <div>
                  • <strong>单文件免安装运行：</strong>直接双击 <strong>单文件无需服务器版 (.html)</strong>，打开后点击右上角 <strong>「□ 最大化」</strong>，同样可一键隐藏浏览器所有边框和地址栏！
                </div>
              </div>
            </div>

            {/* Android Tablet Box */}
            <div className="p-3 bg-blue-950/50 rounded-lg border border-blue-500/50 space-y-1.5 leading-relaxed">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>📱 平板安卓 (Android) / 华为鸿蒙 / iPad：</span>
              </div>
              <div className="text-slate-300 text-[11px] space-y-1">
                <div>
                  • <strong>隐藏地址栏与工具栏：</strong>在平板浏览器中打开后，直接点击右上角 <strong>「□ 最大化」</strong> 按钮，浏览器地址栏与系统导航栏将瞬间隐藏，进入沉浸式应用模式。
                </div>
                <div>
                  • <strong>首选方案：</strong>下载 <strong>单文件无需服务器版 (.html)</strong>，点击即开；或在浏览器菜单选择 <strong>“添加到主屏幕/安装应用” (PWA)</strong>，桌面生成原生应用图标，脱机秒开无地址栏！
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                最新离线单文件版与 ZIP 压缩包已同步更新完成
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                单文件版 ~828KB（免解压直接点击） · ZIP 压缩包 ~453KB
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Standalone Single File HTML (Zero dependency, opens everywhere) */}
              <a
                href="./单文件无需服务器_双击即开.html"
                download="单文件无需服务器_双击即开.html"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs shadow-[0_3px_0_#064e3b,0_4px_10px_rgba(16,185,129,0.35)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer border-t border-emerald-400/50"
                title="单文件独立版，无需解压、无需本地服务器，彻底修复白屏，安卓平板和电脑双击即开！"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>⭐ 免服务器单文件版 (.html 点击即开)</span>
              </a>

              {/* Windows Dedicated Package */}
              <a
                href="./物理运动合成与分解_Windows独立离线包.zip"
                download="物理运动合成与分解_Windows独立离线包.zip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-bold text-xs shadow-[0_2px_0_#78350f] active:translate-y-0.5 transition-all cursor-pointer border-t border-amber-400/50"
                title="Windows系统专属独立打包文件（含一键.bat脚本、单文件版与使用说明）"
              >
                <Download className="w-3.5 h-3.5 text-amber-200" />
                <span>💻 Windows 独立离线包 (.zip)</span>
              </a>

              {/* Android Tablet Dedicated Package */}
              <a
                href="./物理运动合成与分解_Android平板独立离线包.zip"
                download="物理运动合成与分解_Android平板独立离线包.zip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold text-xs shadow-[0_2px_0_#1e3a8a] active:translate-y-0.5 transition-all cursor-pointer border-t border-blue-400/50"
                title="Android平板专属独立打包文件（含平板全屏说明、离线单文件与PWA清单）"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-200" />
                <span>📱 Android 平板独立离线包 (.zip)</span>
              </a>

              {/* Universal USB Portable Package */}
              <a
                href="./物理运动合成与分解_U盘离线绿色包.zip"
                download="物理运动合成与分解_U盘离线绿色包.zip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 hover:from-slate-600 hover:to-slate-700 text-slate-200 font-bold text-xs shadow-[0_2px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer border-t border-slate-500/50"
                title="全平台多合一完整U盘绿色包（含全部平台启动器与文档）"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>📦 U盘多合一绿色包 (.zip)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs shadow-[0_3px_0_#1e3a8a] active:translate-y-0.5 cursor-pointer"
          >
            我知道了，开始使用
          </button>
        </div>
      </div>
    </div>
  );
};
