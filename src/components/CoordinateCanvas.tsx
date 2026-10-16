import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AxisMotionConfig,
  ObservationMode,
  VectorDisplayOptions,
  InstantaneousState,
} from '../types/physics';
import { calculateState } from '../utils/physicsEngine';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  HelpCircle,
  X,
  Sun,
  Moon,
  Camera,
  Download,
  Copy,
  Check,
  FileImage,
  Printer,
  Sparkles,
  Cloud,
  ExternalLink,
  Layers,
  Compass,
  ChevronDown,
  CheckCircle2,
  SplitSquareVertical,
  Grid,
  Route,
} from 'lucide-react';
import { getAccessToken, googleSignIn } from '../services/googleAuth';
import { uploadImageToDrive, DriveFileItem } from '../services/googleDrive';

interface CoordinateCanvasProps {
  xConfig: AxisMotionConfig;
  yConfig: AxisMotionConfig;
  observationMode: ObservationMode;
  onObservationModeChange?: (mode: ObservationMode) => void;
  vectorOptions: VectorDisplayOptions;
  onVectorOptionsChange?: (options: VectorDisplayOptions) => void;
  currentTime: number;
  duration: number;
  onTimeChange: (newTime: number) => void;
  currentState: InstantaneousState;
  currentPresetId?: string | null;
  currentPresetName?: string;
  isRiverCrossingModel?: boolean;
  onOpenDriveModal?: () => void;
}

interface ViewTransform {
  originX: number; // in canvas pixels
  originY: number; // in canvas pixels
  scale: number;   // pixels per meter
}

interface DrawSceneParams {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  scaleFactor: number;
  originX: number;
  originY: number;
  scale: number;
  isDark: boolean;
  xConfig: AxisMotionConfig;
  yConfig: AxisMotionConfig;
  observationMode: ObservationMode;
  vectorOptions: VectorDisplayOptions;
  currentTime: number;
  duration: number;
  currentState: InstantaneousState;
  bannerOffsetTop?: number;
  isRiverCrossing?: boolean;
  ambientTick?: number;
}

/**
 * Water flow mini directional chevron arrow
 */
function drawWaterFlowArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sf: number,
  isDark: boolean,
  direction: number = 1
) {
  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.75)' : 'rgba(2, 132, 199, 0.70)';
  ctx.beginPath();
  if (direction >= 0) {
    ctx.moveTo(x + 5 * sf, y);
    ctx.lineTo(x - 3.5 * sf, y - 3.5 * sf);
    ctx.lineTo(x - 1 * sf, y);
    ctx.lineTo(x - 3.5 * sf, y + 3.5 * sf);
  } else {
    ctx.moveTo(x - 5 * sf, y);
    ctx.lineTo(x + 3.5 * sf, y - 3.5 * sf);
    ctx.lineTo(x + 1 * sf, y);
    ctx.lineTo(x + 3.5 * sf, y + 3.5 * sf);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * River channel, shores, dynamic water ripples, and flow direction indicators
 * (小船渡河模型专属背景，形象展现河水沿X轴流动，形成X轴分运动)
 */
function drawRiverBackgroundAndFlow({
  ctx,
  w,
  h,
  sf,
  originX,
  originY,
  scale,
  isDark,
  currentTime,
  currentState,
  yConfig,
  duration,
  bannerOffsetTop = 0,
  ambientTick = 0,
}: {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  sf: number;
  originX: number;
  originY: number;
  scale: number;
  isDark: boolean;
  currentTime: number;
  currentState: InstantaneousState;
  yConfig: AxisMotionConfig;
  duration: number;
  bannerOffsetTop?: number;
  ambientTick?: number;
}) {
  // River width along Y-axis in meters
  const riverWidth = Math.max(12, (yConfig.v0 || 4) * duration);
  const nearBankPy = originY; // shore at y = 0
  const farBankPy = originY - riverWidth * scale; // opposite shore at y = riverWidth

  const riverTop = Math.max(bannerOffsetTop, Math.min(nearBankPy, farBankPy));
  const riverBottom = Math.min(h + bannerOffsetTop, Math.max(nearBankPy, farBankPy));
  const riverHeight = Math.max(0, riverBottom - riverTop);

  // 1. Water Body Background Fill with flowing aquatic gradient
  if (riverHeight > 0) {
    ctx.save();
    const waterGrad = ctx.createLinearGradient(0, farBankPy, 0, nearBankPy);
    if (isDark) {
      waterGrad.addColorStop(0, 'rgba(7, 43, 72, 0.48)');
      waterGrad.addColorStop(0.5, 'rgba(12, 74, 110, 0.38)');
      waterGrad.addColorStop(1, 'rgba(8, 47, 73, 0.52)');
    } else {
      waterGrad.addColorStop(0, 'rgba(186, 230, 253, 0.44)');
      waterGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.34)');
      waterGrad.addColorStop(1, 'rgba(186, 230, 253, 0.44)');
    }
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, riverTop, w, riverHeight);
    ctx.restore();
  }

  // 2. Near Bank (出发岸 y = 0)
  if (nearBankPy >= bannerOffsetTop && nearBankPy <= h + bannerOffsetTop) {
    ctx.save();
    ctx.strokeStyle = isDark ? '#10b981' : '#059669';
    ctx.lineWidth = 3 * sf;
    ctx.beginPath();
    ctx.moveTo(0, nearBankPy);
    ctx.lineTo(w, nearBankPy);
    ctx.stroke();

    // Shore sand/grass fringe
    ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.45)' : 'rgba(5, 150, 105, 0.35)';
    ctx.lineWidth = 1.5 * sf;
    ctx.setLineDash([4 * sf, 4 * sf]);
    ctx.beginPath();
    ctx.moveTo(0, nearBankPy + 4 * sf);
    ctx.lineTo(w, nearBankPy + 4 * sf);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shore label
    ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
    ctx.fillStyle = isDark ? '#34d399' : '#047857';
    ctx.fillText('📍 出发岸 (y = 0.0m · 启航始发河岸)', Math.max(16 * sf, originX + 16 * sf), nearBankPy + 16 * sf);
    ctx.restore();
  }

  // 3. Opposite Bank (目标对岸 y = riverWidth)
  if (farBankPy >= bannerOffsetTop && farBankPy <= h + bannerOffsetTop) {
    ctx.save();
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 2.5 * sf;
    ctx.beginPath();
    ctx.moveTo(0, farBankPy);
    ctx.lineTo(w, farBankPy);
    ctx.stroke();

    // Opposite shore fringe
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.3)';
    ctx.lineWidth = 1.5 * sf;
    ctx.setLineDash([4 * sf, 4 * sf]);
    ctx.beginPath();
    ctx.moveTo(0, farBankPy - 4 * sf);
    ctx.lineTo(w, farBankPy - 4 * sf);
    ctx.stroke();
    ctx.setLineDash([]);

    // Opposite shore label
    ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
    ctx.fillStyle = isDark ? '#7dd3fc' : '#0369a1';
    ctx.fillText(`🏁 目标对岸 (河宽 d = ${riverWidth.toFixed(1)}m · 垂直对岸线)`, Math.max(16 * sf, originX + 16 * sf), farBankPy - 8 * sf);
    ctx.restore();
  }

  // 4. Dynamic Water Streamlines & Ripples (动态水流流动方向)
  const flowSpeed = currentState.vx !== 0 ? currentState.vx : 3;
  const flowDirection = Math.sign(flowSpeed) || 1;
  const waveOffset = ((currentTime * flowSpeed * 32 + ambientTick * 1.5) * sf) % (120 * sf);

  const streamCount = 5;
  for (let i = 1; i <= streamCount; i++) {
    const streamYWorld = (riverWidth * i) / (streamCount + 1);
    const streamPy = originY - streamYWorld * scale;
    if (streamPy < bannerOffsetTop - 10 || streamPy > h + bannerOffsetTop + 10) continue;

    // Wavy streamline
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(2, 132, 199, 0.20)';
    ctx.lineWidth = 1.2 * sf;
    ctx.beginPath();
    for (let px = 0; px <= w; px += 10 * sf) {
      const waveY = streamPy + Math.sin((px - waveOffset) * 0.035 + i * 1.2) * (2.8 * sf);
      if (px === 0) ctx.moveTo(px, waveY);
      else ctx.lineTo(px, waveY);
    }
    ctx.stroke();

    // Spaced flow arrows pointing in water flow direction (+X)
    const arrowSpacing = 140 * sf;
    const numArrows = Math.ceil(w / arrowSpacing) + 2;
    for (let a = -1; a <= numArrows; a++) {
      const rawX = a * arrowSpacing + (waveOffset % arrowSpacing);
      const arrowX = flowDirection >= 0 ? rawX : w - rawX;
      if (arrowX > 10 && arrowX < w - 10) {
        const arrY = streamPy + Math.sin((arrowX - waveOffset) * 0.035 + i * 1.2) * (2.8 * sf);
        drawWaterFlowArrow(ctx, arrowX, arrY, sf, isDark, flowDirection);
      }
    }
    ctx.restore();
  }

  // 5. Water Flow Educational HUD Banner (固定置于屏幕右下角，不遮挡主题画面和运动质点)
  const hudBoxW = 360 * sf;
  const hudBoxH = 28 * sf;
  const hudPx = Math.max(16 * sf, w - hudBoxW - 16 * sf);
  const hudPy = h - hudBoxH * 0.5 - 14 * sf;

  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = isDark ? '#0284c7' : '#38bdf8';
  ctx.lineWidth = 1.5 * sf;
  ctx.beginPath();
  ctx.roundRect(hudPx, hudPy - 14 * sf, hudBoxW, hudBoxH, 6 * sf);
  ctx.fill();
  ctx.stroke();

  ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
  ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
  const flowSignStr = flowDirection >= 0 ? '➔➔➔' : '⬅⬅⬅';
  ctx.fillText(
    `🌊 水流流动方向 ${flowSignStr} (水流速度 v_水 = ${flowSpeed.toFixed(1)} m/s · 形成X轴分运动)`,
    hudPx + 10 * sf,
    hudPy + 4 * sf
  );
  ctx.restore();
}

/**
 * Top-down realistic Boat model
 * (船头始终指向 +y 轴方向，直观表明 Y 轴分运动是由小船自身动力推进形成的)
 */
function drawBoat(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  sf: number,
  isDark: boolean,
  currentTime: number,
  currentState: InstantaneousState
) {
  const L = 38 * sf; // boat length
  const W = 18 * sf; // boat width

  // 1. Stern Propeller Wake (船尾推力尾波与水花，向 -y 方向喷流，驱动小船沿 +y 前进)
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(224, 242, 254, 0.55)' : 'rgba(14, 116, 144, 0.45)';
  ctx.lineWidth = 1.8 * sf;
  ctx.setLineDash([3 * sf, 3 * sf]);

  // Left expanding wake wave
  ctx.beginPath();
  ctx.moveTo(px - 5 * sf, py + L * 0.44);
  ctx.lineTo(px - 18 * sf, py + L * 0.95);
  ctx.stroke();

  // Right expanding wake wave
  ctx.beginPath();
  ctx.moveTo(px + 5 * sf, py + L * 0.44);
  ctx.lineTo(px + 18 * sf, py + L * 0.95);
  ctx.stroke();
  ctx.setLineDash([]);

  // Propeller frothy bubbles
  const bubbleOffset = (currentTime * 14) % 6;
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(px, py + L * 0.52 + bubbleOffset * sf, 2.8 * sf, 0, Math.PI * 2);
  ctx.arc(px - 4 * sf, py + L * 0.65, 2.2 * sf, 0, Math.PI * 2);
  ctx.arc(px + 4 * sf, py + L * 0.65, 2.2 * sf, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Boat Outer Hull Shadow
  ctx.save();
  if (isDark) {
    ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
    ctx.shadowBlur = 12 * sf;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 7 * sf;
  }

  // 3. Boat Hull Body (Bow strictly pointing UP in screen, which is +y in physics coordinates)
  ctx.beginPath();
  // Bow point at top (strictly pointing UP)
  ctx.moveTo(px, py - L * 0.54);
  // Curve down right side
  ctx.bezierCurveTo(px + W * 0.55, py - L * 0.25, px + W * 0.52, py + L * 0.2, px + W * 0.38, py + L * 0.46);
  // Transom flat bottom
  ctx.lineTo(px - W * 0.38, py + L * 0.46);
  // Curve up left side
  ctx.bezierCurveTo(px - W * 0.52, py + L * 0.2, px - W * 0.55, py - L * 0.25, px, py - L * 0.54);
  ctx.closePath();

  // Hull teak wood gradient
  const hullGrad = ctx.createLinearGradient(px - W * 0.5, py, px + W * 0.5, py);
  hullGrad.addColorStop(0, '#92400e');   // amber-800
  hullGrad.addColorStop(0.2, '#d97706'); // amber-600
  hullGrad.addColorStop(0.5, '#f59e0b'); // amber-500
  hullGrad.addColorStop(0.8, '#d97706');
  hullGrad.addColorStop(1, '#92400e');
  ctx.fillStyle = hullGrad;
  ctx.fill();

  // Gunwale outer border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * sf;
  ctx.stroke();
  ctx.restore();

  // 4. Inner Deck Planks / Racing Deck Line
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
  ctx.lineWidth = 1 * sf;
  ctx.beginPath();
  ctx.moveTo(px, py - L * 0.4);
  ctx.lineTo(px, py + L * 0.4);
  ctx.stroke();

  // 5. Cockpit Cabin & Windshield
  ctx.fillStyle = isDark ? '#0284c7' : '#0369a1';
  ctx.beginPath();
  ctx.roundRect(px - W * 0.24, py - L * 0.08, W * 0.48, L * 0.28, 3 * sf);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1 * sf;
  ctx.stroke();

  // Windshield cyan glass reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.moveTo(px - W * 0.16, py - L * 0.04);
  ctx.lineTo(px - W * 0.04, py - L * 0.04);
  ctx.lineTo(px - W * 0.12, py + L * 0.14);
  ctx.closePath();
  ctx.fill();

  // 6. Bow Direction Indicator (船头定向三角标，鲜明指示 +y 轴方向)
  ctx.fillStyle = '#ef4444'; // Red prow directional chevron
  ctx.beginPath();
  ctx.moveTo(px, py - L * 0.48);
  ctx.lineTo(px + 4 * sf, py - L * 0.32);
  ctx.lineTo(px, py - L * 0.36);
  ctx.lineTo(px - 4 * sf, py - L * 0.32);
  ctx.closePath();
  ctx.fill();

  // 7. Stern Outboard Motor
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(px - 3.5 * sf, py + L * 0.44, 7 * sf, 4.5 * sf);

  // 8. Boat Center Pivot Dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 2.5 * sf, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Pure coordinate scene drawing routine used by both on-screen render and high-res snapshot export.
 */
function drawSceneToContext({
  ctx,
  w,
  h,
  scaleFactor,
  originX,
  originY,
  scale,
  isDark,
  xConfig,
  yConfig,
  observationMode,
  vectorOptions,
  currentTime,
  duration,
  currentState,
  bannerOffsetTop = 0,
  isRiverCrossing = false,
  ambientTick = 0,
}: DrawSceneParams) {
  const sf = scaleFactor;

  // Coordinate Conversion Helpers
  const toScreen = (x: number, y: number) => ({
    px: originX + x * scale,
    py: originY - y * scale,
  });

  const toWorld = (px: number, py: number) => ({
    x: (px - originX) / scale,
    y: (originY - py) / scale,
  });

  // Helper: Draw Vector Arrow
  const drawArrow = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    lineWidth = 2.5 * sf,
    dash: number[] = [],
    headLength = 10 * sf
  ) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < 2 * sf) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    if (dash.length > 0) ctx.setLineDash(dash.map((d) => d * sf));

    // Line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrow head
    ctx.setLineDash([]);
    const angle = Math.atan2(dy, dx);
    const actualHeadLength = Math.min(headLength, dist * 0.45);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - actualHeadLength * Math.cos(angle - Math.PI / 6),
      toY - actualHeadLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - actualHeadLength * Math.cos(angle + Math.PI / 6),
      toY - actualHeadLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // 0. River Water Background & Flow (小船渡河模型专属动态水流背景)
  if (isRiverCrossing) {
    drawRiverBackgroundAndFlow({
      ctx,
      w,
      h,
      sf,
      originX,
      originY,
      scale,
      isDark,
      currentTime,
      currentState,
      yConfig,
      duration,
      bannerOffsetTop,
      ambientTick,
    });
  }

  // 1. Grid Background & Grid Lines
  const minWorld = toWorld(0, h + bannerOffsetTop);
  const maxWorld = toWorld(w, bannerOffsetTop);

  const targetPxSpacing = 60 * sf;
  const rawStep = targetPxSpacing / scale;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let step = magnitude;
  if (normalized >= 5) step = 5 * magnitude;
  else if (normalized >= 2) step = 2 * magnitude;
  else step = magnitude;

  // Grid Lines
  ctx.strokeStyle = isDark ? '#142034' : '#e2e8f0';
  ctx.lineWidth = Math.max(1, 1 * sf);
  ctx.font = `${Math.round(11 * sf)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.fillStyle = isDark ? '#4b6182' : '#94a3b8';

  const startGridX = Math.floor(minWorld.x / step) * step;
  const endGridX = Math.ceil(maxWorld.x / step) * step;

  for (let gx = startGridX; gx <= endGridX; gx += step) {
    const px = Math.round(originX + gx * scale) + 0.5;
    if (px >= 0 && px <= w) {
      ctx.beginPath();
      ctx.moveTo(px, bannerOffsetTop);
      ctx.lineTo(px, h + bannerOffsetTop);
      ctx.stroke();

      if (Math.abs(gx) > 1e-4) {
        const numStr = Math.abs(gx) >= 100 ? gx.toFixed(0) : Math.abs(gx) < 1 ? gx.toFixed(2) : gx.toFixed(1);
        const textY = Math.min(Math.max(originY + 16 * sf, bannerOffsetTop + 20 * sf), h + bannerOffsetTop - 10 * sf);
        ctx.fillText(numStr, px + 3 * sf, textY);
      }
    }
  }

  const startGridY = Math.floor(minWorld.y / step) * step;
  const endGridY = Math.ceil(maxWorld.y / step) * step;

  for (let gy = startGridY; gy <= endGridY; gy += step) {
    const py = Math.round(originY - gy * scale) + 0.5;
    if (py >= bannerOffsetTop && py <= h + bannerOffsetTop) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();

      if (Math.abs(gy) > 1e-4) {
        const numStr = Math.abs(gy) >= 100 ? gy.toFixed(0) : Math.abs(gy) < 1 ? gy.toFixed(2) : gy.toFixed(1);
        const textX = Math.min(Math.max(originX + 6 * sf, 8 * sf), w - 40 * sf);
        ctx.fillText(numStr, textX, py - 4 * sf);
      }
    }
  }

  // 2. Primary Coordinate Axes (X and Y with arrows)
  const origPx = originX;
  const origPy = originY;

  // X Axis
  ctx.strokeStyle = isDark ? '#94a3b8' : '#0f172a';
  ctx.lineWidth = Math.max(1.5, 2 * sf);
  ctx.beginPath();
  ctx.moveTo(0, origPy);
  ctx.lineTo(w, origPy);
  ctx.stroke();

  // X Arrow
  ctx.fillStyle = isDark ? '#94a3b8' : '#0f172a';
  ctx.beginPath();
  ctx.moveTo(w - 2 * sf, origPy);
  ctx.lineTo(w - 12 * sf, origPy - 5 * sf);
  ctx.lineTo(w - 12 * sf, origPy + 5 * sf);
  ctx.closePath();
  ctx.fill();

  // X Label
  ctx.font = `bold ${Math.round(13 * sf)}px sans-serif`;
  ctx.fillText('x (m)', w - 45 * sf, origPy - 10 * sf);

  // Y Axis
  ctx.beginPath();
  ctx.moveTo(origPx, h + bannerOffsetTop);
  ctx.lineTo(origPx, bannerOffsetTop);
  ctx.stroke();

  // Y Arrow
  ctx.beginPath();
  ctx.moveTo(origPx, bannerOffsetTop + 2 * sf);
  ctx.lineTo(origPx - 5 * sf, bannerOffsetTop + 12 * sf);
  ctx.lineTo(origPx + 5 * sf, bannerOffsetTop + 12 * sf);
  ctx.closePath();
  ctx.fill();

  // Y Label
  ctx.fillText('y (m)', origPx + 10 * sf, bannerOffsetTop + 18 * sf);

  // Origin Mark O
  ctx.font = `bold ${Math.round(12 * sf)}px sans-serif`;
  ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
  ctx.fillText('O (0, 0)', origPx - 44 * sf, origPy + 18 * sf);

  // 3. Stroboscopic Trace (频闪摄影 / 打点计时器)
  if (vectorOptions.showStrobe) {
    const interval = Math.max(0.1, vectorOptions.strobeInterval || 0.5);
    const strobeCount = Math.floor(duration / interval);

    for (let sIdx = 1; sIdx <= strobeCount; sIdx++) {
      const stTime = sIdx * interval;
      const stState = calculateState(stTime, xConfig, yConfig, observationMode);
      const { px, py } = toScreen(stState.x, stState.y);

      const isPastOrCurrent = stTime <= currentTime;
      ctx.fillStyle = isPastOrCurrent
        ? (isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(37, 99, 235, 0.5)')
        : (isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(148, 163, 184, 0.25)');
      ctx.beginPath();
      ctx.arc(px, py, 4.5 * sf, 0, Math.PI * 2);
      ctx.fill();

      // Strobe label
      ctx.font = `${Math.round(10 * sf)}px monospace`;
      ctx.fillStyle = isPastOrCurrent ? (isDark ? '#7dd3fc' : '#2563eb') : (isDark ? '#64748b' : '#94a3b8');
      ctx.fillText(`t=${stTime.toFixed(1)}s`, px + 6 * sf, py - 4 * sf);
    }
  }

  // 4. Trajectory Path (合运动轨迹)
  if (vectorOptions.showTrajectory) {
    const steps = 120;

    // 4A. Future path (dashed line)
    ctx.save();
    ctx.strokeStyle = isDark ? '#2a3a52' : '#cbd5e1';
    ctx.lineWidth = Math.max(1, 1.5 * sf);
    ctx.setLineDash([4 * sf, 4 * sf]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration;
      const st = calculateState(t, xConfig, yConfig, observationMode);
      const { px, py } = toScreen(st.x, st.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // 4B. Traversed path up to current time (solid luminous trajectory)
    if (currentTime > 0) {
      ctx.save();
      if (isDark) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10 * sf;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5 * sf;
      } else {
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3 * sf;
      }
      ctx.beginPath();
      const curSteps = Math.max(10, Math.round((currentTime / duration) * steps));
      for (let i = 0; i <= curSteps; i++) {
        const t = (i / curSteps) * currentTime;
        const st = calculateState(t, xConfig, yConfig, observationMode);
        const { px, py } = toScreen(st.x, st.y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Screen positions of current state
  const currentScreen = toScreen(currentState.x, currentState.y);
  const projXScreen = toScreen(currentState.x, 0);
  const projYScreen = toScreen(0, currentState.y);

  // 5. Projections & Component Guide Lines (三球联动与虚线矩形)
  if (vectorOptions.showProjections && observationMode === 'both') {
    ctx.save();
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = Math.max(1, 1.5 * sf);
    ctx.setLineDash([4 * sf, 4 * sf]);

    // Vertical projection line: from (x, 0) to (x, y)
    ctx.beginPath();
    ctx.moveTo(projXScreen.px, projXScreen.py);
    ctx.lineTo(currentScreen.px, currentScreen.py);
    ctx.stroke();

    // Horizontal projection line: from (0, y) to (x, y)
    ctx.beginPath();
    ctx.moveTo(projYScreen.px, projYScreen.py);
    ctx.lineTo(currentScreen.px, currentScreen.py);
    ctx.stroke();
    ctx.restore();

    // Projection Ball on X axis (Emerald Green)
    ctx.save();
    if (isDark) {
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8 * sf;
    }
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.arc(projXScreen.px, projXScreen.py, 7 * sf, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * sf;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = isDark ? '#34d399' : '#047857';
    ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
    ctx.fillText(
      isRiverCrossing
        ? `水流冲刷带动 (${currentState.x.toFixed(2)}m)`
        : `X分运动 (${currentState.x.toFixed(2)}m)`,
      projXScreen.px - (isRiverCrossing ? 48 * sf : 32 * sf),
      projXScreen.py + 18 * sf
    );

    // Projection Ball on Y axis (Amber / Gold)
    ctx.save();
    if (isDark) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8 * sf;
    }
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(projYScreen.px, projYScreen.py, 7 * sf, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * sf;
    ctx.stroke();
    ctx.restore();

    if (isRiverCrossing) {
      // Y轴分运动 (船头动力推进): 改在箭头左侧竖排，避免遮挡右侧主题画面与运动矢量
      const verticalChars = ['船', '头', '动', '力', '推', '进'];
      const charSpacing = 13.5 * sf;
      const totalBlockHeight = (verticalChars.length + 1) * charSpacing;

      // 文本块沿Y轴分运动箭头居中放置，并留足边界余量
      let blockCenterY = (origPy + projYScreen.py) / 2;
      blockCenterY = Math.min(origPy - totalBlockHeight / 2 - 6 * sf, blockCenterY);
      blockCenterY = Math.max(totalBlockHeight / 2 + 25 * sf, blockCenterY);
      const startY = blockCenterY - totalBlockHeight / 2;

      const textX = projYScreen.px - 22 * sf;
      ctx.save();
      ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
      ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      verticalChars.forEach((ch, idx) => {
        ctx.fillText(ch, textX, startY + idx * charSpacing);
      });

      // 推进距离数值与单位 (例如 4.00m)
      ctx.font = `bold ${Math.round(10.5 * sf)}px sans-serif`;
      ctx.fillText(`${currentState.y.toFixed(2)}m`, textX, startY + verticalChars.length * charSpacing);
      ctx.restore();
    } else {
      ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
      ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
      ctx.fillText(
        `Y分运动 (${currentState.y.toFixed(2)}m)`,
        projYScreen.px + 12 * sf,
        projYScreen.py + 4 * sf
      );
    }
  }

  // 6. Vector Compositions & Resolutions

  // 6A. 位移合成与分解 (Displacement Vector s)
  if (vectorOptions.showDisplacement) {
    const dispColor = isDark ? '#38bdf8' : '#0284c7';
    const compColor = isDark ? '#0284c7' : '#0369a1';

    drawArrow(origPx, origPy, currentScreen.px, currentScreen.py, dispColor, 2.8 * sf);

    if (observationMode === 'both') {
      // 分位移矢量：实线箭头
      drawArrow(origPx, origPy, projXScreen.px, projXScreen.py, compColor, 2.4 * sf);
      drawArrow(origPx, origPy, projYScreen.px, projYScreen.py, compColor, 2.4 * sf);

      if (vectorOptions.showParallelogram) {
        ctx.save();
        ctx.strokeStyle = isDark ? '#0284c7' : '#38bdf8';
        ctx.lineWidth = Math.max(1, 1 * sf);
        ctx.setLineDash([3 * sf, 3 * sf]);
        ctx.beginPath();
        ctx.moveTo(projXScreen.px, projXScreen.py);
        ctx.lineTo(currentScreen.px, currentScreen.py);
        ctx.moveTo(projYScreen.px, projYScreen.py);
        ctx.lineTo(currentScreen.px, currentScreen.py);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
    ctx.fillStyle = dispColor;
    const midPx = (origPx + currentScreen.px) / 2;
    const midPy = (origPy + currentScreen.py) / 2;
    ctx.fillText(`s = ${currentState.s.toFixed(2)} m`, midPx + 8 * sf, midPy - 8 * sf);
  }

  // 6B. 速度合成与分解 (Velocity Vector v)
  if (vectorOptions.showVelocity && currentState.v > 0.05) {
    const velColor = isDark ? '#f43f5e' : '#dc2626';
    const velCompColor = isDark ? '#fb7185' : '#e11d48';

    // 缩放响应：随画布缩放比例 (scale) 动态等比例放大/缩小平行四边形（基准为默认 scale = 35）
    const zoomRatio = Math.max(0.25, scale / 35);
    const maxVel = Math.max(Math.abs(currentState.vx), Math.abs(currentState.vy), currentState.v);
    const baseVScale = maxVel <= 3.5 ? 13.0 : maxVel <= 7.0 ? 9.5 : maxVel <= 12.0 ? 7.0 : 5.0;
    const vScale = baseVScale * zoomRatio * sf;

    const vTipX = currentScreen.px + currentState.vx * vScale;
    const vTipY = currentScreen.py - currentState.vy * vScale;
    const vxTipX = currentScreen.px + currentState.vx * vScale;
    const vxTipY = currentScreen.py;
    const vyTipX = currentScreen.px;
    const vyTipY = currentScreen.py - currentState.vy * vScale;

    // 绘制合速度主箭头 (实线)
    drawArrow(currentScreen.px, currentScreen.py, vTipX, vTipY, velColor, 3.2 * sf);

    const hasVx = Math.abs(currentState.vx) > 0.05;
    const hasVy = Math.abs(currentState.vy) > 0.05;

    if (observationMode === 'both') {
      // 分速度矢量：实线箭头 (严格遵循物理矢量实线规范)
      if (hasVx) {
        drawArrow(currentScreen.px, currentScreen.py, vxTipX, vxTipY, velCompColor, 2.4 * sf);
      }
      if (hasVy) {
        drawArrow(currentScreen.px, currentScreen.py, vyTipX, vyTipY, velCompColor, 2.4 * sf);
      }

      if (vectorOptions.showParallelogram && hasVx && hasVy) {
        ctx.save();
        ctx.strokeStyle = isDark ? '#f43f5e' : '#f87171';
        ctx.lineWidth = Math.max(1, 1 * sf);
        ctx.setLineDash([3 * sf, 3 * sf]);
        ctx.beginPath();
        ctx.moveTo(vxTipX, vxTipY);
        ctx.lineTo(vTipX, vTipY);
        ctx.moveTo(vyTipX, vyTipY);
        ctx.lineTo(vTipX, vTipY);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
    ctx.fillStyle = velColor;

    // 合速度数值标注 (位于合速度箭头顶端外侧，绝不遮挡平行四边形内部与边框)
    const hasBothV = hasVx && hasVy;
    const vLabel = isRiverCrossing
      ? `v合 = ${currentState.v.toFixed(2)} m/s`
      : (hasBothV ? `v合 = ${currentState.v.toFixed(2)} m/s` : `v = ${currentState.v.toFixed(2)} m/s`);

    ctx.save();
    const vAlignRight = currentState.vx < 0;
    ctx.textAlign = vAlignRight ? 'right' : 'left';
    const vOffsetY = currentState.vy >= 0 ? -8 * sf : 16 * sf;
    ctx.fillText(
      vLabel,
      vTipX + (vAlignRight ? -8 * sf : 8 * sf),
      vTipY + vOffsetY
    );
    ctx.restore();

    if (observationMode === 'both') {
      // 分速度数值标注：精确定位在分速度矢量的箭头顶端外侧，随缩放始终锚定跟随箭头，且完全不遮挡平行四边形
      if (hasVx) {
        ctx.save();
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.textAlign = 'center';
        // 平行四边形在水平线上方(vy >= 0)时，vx标注位于水平线下方；反之在上方
        const vxLabelY = currentScreen.py + (currentState.vy >= 0 ? 18 * sf : -12 * sf);
        // 核心改动：锚定在 vx 箭头顶端 (vxTipX) 附近，放大/缩小/移动时始终跟随箭头！
        const vxLabelX = Math.min(w - 36 * sf, Math.max(36 * sf, vxTipX));
        const vxText = isRiverCrossing
          ? `v_水 = ${currentState.vx.toFixed(1)} m/s`
          : `vx = ${currentState.vx.toFixed(1)} m/s`;
        ctx.fillText(vxText, vxLabelX, vxLabelY);
        ctx.restore();
      }

      if (hasVy) {
        ctx.save();
        ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
        // 平行四边形在竖直线右侧(vx >= 0)时，vy标注位于竖直线左侧；反之在右侧
        const vyAlignRight = currentState.vx >= 0;
        ctx.textAlign = vyAlignRight ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        const vyLabelX = currentScreen.px + (vyAlignRight ? -10 * sf : 10 * sf);
        // 核心改动：锚定在 vy 箭头顶端 (vyTipY) 附近，放大/缩小/移动时始终跟随箭头！
        const vyLabelY = Math.min(h - 18 * sf, Math.max(18 * sf, vyTipY));
        const vyText = isRiverCrossing
          ? `v_船 = ${currentState.vy.toFixed(1)} m/s`
          : `vy = ${currentState.vy.toFixed(1)} m/s`;
        ctx.fillText(vyText, vyLabelX, vyLabelY);
        ctx.restore();
      }
    }
  }

  // 6C. 加速度合成与分解 (Acceleration Vector a)
  if (vectorOptions.showAcceleration && currentState.a > 0.05) {
    const accColor = isDark ? '#fbbf24' : '#d97706';
    const accCompColor = isDark ? '#fde047' : '#b45309';

    // 缩放响应：随画布缩放比例 (scale) 动态等比例放大/缩小加速度平行四边形
    const zoomRatio = Math.max(0.25, scale / 35);
    const maxAccel = Math.max(Math.abs(currentState.ax), Math.abs(currentState.ay), currentState.a);
    const baseAScale = maxAccel <= 3.5 ? 18.0 : maxAccel <= 6.0 ? 13.0 : maxAccel <= 10.5 ? 9.0 : 6.5;
    const aScale = baseAScale * zoomRatio * sf;

    const aTipX = currentScreen.px + currentState.ax * aScale;
    const aTipY = currentScreen.py - currentState.ay * aScale;
    const axTipX = currentScreen.px + currentState.ax * aScale;
    const axTipY = currentScreen.py;
    const ayTipX = currentScreen.px;
    const ayTipY = currentScreen.py - currentState.ay * aScale;

    // 绘制合加速度主矢量
    drawArrow(currentScreen.px, currentScreen.py, aTipX, aTipY, accColor, 3.2 * sf);

    const hasAx = Math.abs(currentState.ax) > 0.05;
    const hasAy = Math.abs(currentState.ay) > 0.05;

    if (observationMode === 'both') {
      // 分加速度矢量：实线箭头 (严格遵循物理矢量实线规范)
      if (hasAx) {
        drawArrow(currentScreen.px, currentScreen.py, axTipX, axTipY, accCompColor, 2.4 * sf);
      }
      if (hasAy) {
        drawArrow(currentScreen.px, currentScreen.py, ayTipX, ayTipY, accCompColor, 2.4 * sf);
      }

      // 加速度平行四边形定则合成虚线框（当存在两轴分加速度时完整闭合）
      if (vectorOptions.showParallelogram && hasAx && hasAy) {
        ctx.save();
        ctx.strokeStyle = isDark ? '#f59e0b' : '#fbbf24';
        ctx.lineWidth = Math.max(1, 1 * sf);
        ctx.setLineDash([3 * sf, 3 * sf]);
        ctx.beginPath();
        ctx.moveTo(axTipX, axTipY);
        ctx.lineTo(aTipX, aTipY);
        ctx.moveTo(ayTipX, ayTipY);
        ctx.lineTo(aTipX, aTipY);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.font = `bold ${Math.round(11 * sf)}px sans-serif`;
    ctx.fillStyle = accColor;

    const hasBothA = hasAx && hasAy;
    const aLabel = hasBothA
      ? `a合 = ${currentState.a.toFixed(2)} m/s²`
      : `a = ${currentState.a.toFixed(2)} m/s²`;

    // 合加速度数值标注 (位于合加速度箭头顶端外侧，绝不遮挡平行四边形，随缩放始终锚定跟随箭头)
    ctx.save();
    const aAlignRight = currentState.ax < 0;
    ctx.textAlign = aAlignRight ? 'right' : 'left';
    let aOffsetY = currentState.ay >= 0 ? -8 * sf : 16 * sf;
    const aLabelX = aTipX + (aAlignRight ? -8 * sf : 8 * sf);

    // 若同时显示速度与加速度且两合矢量箭头末端非常靠近，做错位避让防止重叠
    if (vectorOptions.showVelocity && currentState.v > 0.05) {
      // 检查合速度箭头末端位置
      const maxVel = Math.max(Math.abs(currentState.vx), Math.abs(currentState.vy), currentState.v);
      const baseVScale = maxVel <= 3.5 ? 13.0 : maxVel <= 7.0 ? 9.5 : maxVel <= 12.0 ? 7.0 : 5.0;
      const vScale = baseVScale * zoomRatio * sf;
      const vTipX = currentScreen.px + currentState.vx * vScale;
      const vTipY = currentScreen.py - currentState.vy * vScale;
      const distToVTip = Math.hypot(aTipX - vTipX, aTipY - vTipY);
      if (distToVTip < 36 * sf) {
        aOffsetY += (currentState.ay >= 0 ? -16 * sf : 20 * sf);
      }
    }

    ctx.fillText(
      aLabel,
      aLabelX,
      aTipY + aOffsetY
    );
    ctx.restore();

    // 两轴观察模式下，分加速度 ax 与 ay 数值精确定位在分加速度矢量箭头附近，随缩放始终跟随箭头
    if (observationMode === 'both') {
      if (hasAx) {
        ctx.save();
        ctx.fillStyle = isDark ? '#fde047' : '#b45309';
        ctx.textAlign = 'center';
        // 若同时显示速度且两矢量同向在同侧，做垂直错距偏移避免文字叠放
        const hasActiveVelX = vectorOptions.showVelocity && Math.abs(currentState.vx) > 0.05;
        const sameSideY = (currentState.vy >= 0 && currentState.ay >= 0) || (currentState.vy < 0 && currentState.ay < 0);
        const axOffset = hasActiveVelX && sameSideY ? 34 * sf : 18 * sf;
        const axLabelY = currentScreen.py + (currentState.ay >= 0 ? axOffset : -(hasActiveVelX && sameSideY ? 28 * sf : 14 * sf));
        // 核心改动：锚定在 ax 箭头顶端 (axTipX) 附近，放大/缩小/移动时始终跟随箭头！
        const axLabelX = Math.min(w - 45 * sf, Math.max(45 * sf, axTipX));
        ctx.fillText(`ax = ${currentState.ax.toFixed(1)} m/s²`, axLabelX, axLabelY);
        ctx.restore();
      }

      if (hasAy) {
        ctx.save();
        ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
        const ayAlignRight = currentState.ax >= 0;
        ctx.textAlign = ayAlignRight ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        let ayLabelX = currentScreen.px + (ayAlignRight ? -10 * sf : 10 * sf);
        // 核心改动：锚定在 ay 箭头顶端 (ayTipY) 附近，放大/缩小/移动时始终跟随箭头！
        const ayLabelY = Math.min(h - 18 * sf, Math.max(18 * sf, ayTipY));
        // 若同时显示速度且 vy 与 ay 箭头顶端垂直非常靠近，做横向错位
        if (vectorOptions.showVelocity && Math.abs(currentState.vy) > 0.05) {
          const maxVel = Math.max(Math.abs(currentState.vx), Math.abs(currentState.vy), currentState.v);
          const baseVScale = maxVel <= 3.5 ? 13.0 : maxVel <= 7.0 ? 9.5 : maxVel <= 12.0 ? 7.0 : 5.0;
          const vScale = baseVScale * zoomRatio * sf;
          const vyTipYVal = currentScreen.py - currentState.vy * vScale;
          if (Math.abs(vyTipYVal - ayLabelY) < 22 * sf) {
            ayLabelX += (ayAlignRight ? -58 * sf : 58 * sf);
          }
        }
        ctx.fillText(`ay = ${currentState.ay.toFixed(1)} m/s²`, ayLabelX, ayLabelY);
        ctx.restore();
      }
    }
  }

  // 7. Main Particle / Boat Model (合运动质点：小船渡河模型显示为小船，船头始终指向+y方向)
  if (isRiverCrossing) {
    drawBoat(ctx, currentScreen.px, currentScreen.py, sf, isDark, currentTime, currentState);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(currentScreen.px, currentScreen.py, 15 * sf, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(37, 99, 235, 0.18)';
    ctx.fill();

    if (isDark) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12 * sf;
    }
    ctx.beginPath();
    ctx.arc(currentScreen.px, currentScreen.py, 8.5 * sf, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#38bdf8' : '#1d4ed8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * sf;
    ctx.stroke();

    ctx.restore();
  }

  // 8. Fixed Position Coordinate HUD Badge in Top-Right Corner (所有播放模块固定显示在主舞台右上角)
  ctx.save();
  const coordText = `位置坐标 (${currentState.x.toFixed(2)}m, ${currentState.y.toFixed(2)}m)`;
  ctx.font = `bold ${Math.round(11.5 * sf)}px sans-serif`;
  const textMetrics = ctx.measureText(coordText);
  const badgeW = textMetrics.width + 24 * sf;
  const badgeH = 28 * sf;
  const badgeX = w - badgeW - 16 * sf;
  const badgeY = bannerOffsetTop + 14 * sf;

  // 半透明高科技深邃玻璃面板底色
  ctx.fillStyle = isDark ? 'rgba(10, 15, 26, 0.88)' : 'rgba(255, 255, 255, 0.94)';
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.55)' : 'rgba(2, 132, 199, 0.55)';
  ctx.lineWidth = Math.max(1, 1.2 * sf);
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6 * sf);
  ctx.fill();
  ctx.stroke();

  // 左侧专属天蓝色指示条
  ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
  ctx.beginPath();
  ctx.roundRect(badgeX + 3.5 * sf, badgeY + 4 * sf, 3.5 * sf, badgeH - 8 * sf, 2 * sf);
  ctx.fill();

  // 文本内容：写位置坐标，然后括号写上坐标值
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(coordText, badgeX + 13 * sf, badgeY + badgeH / 2);
  ctx.restore();
}

/**
 * Draws high-resolution vector legend box on snapshot canvas
 */
function drawLegendBox(
  ctx: CanvasRenderingContext2D,
  w: number,
  sf: number,
  isDark: boolean,
  topOffset: number,
  vectorOptions: VectorDisplayOptions,
  observationMode: ObservationMode
) {
  const boxW = Math.round(230 * sf);
  const boxH = Math.round(36 * sf);
  const boxX = w - boxW - Math.round(16 * sf);
  // 快照模式下位于右上角位置坐标卡片下方，规整纵向排列
  const boxY = topOffset + Math.round(14 * sf + 34 * sf);

  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(10, 15, 26, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
  ctx.lineWidth = Math.max(1, 1 * sf);
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 6 * sf);
  ctx.fill();
  ctx.stroke();

  ctx.font = `bold ${Math.round(10 * sf)}px sans-serif`;
  let curX = boxX + 10 * sf;
  const curY = boxY + 22 * sf;

  // Label "图例"
  ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
  ctx.fillText('矢量图例:', curX, curY);
  curX += 48 * sf;

  if (vectorOptions.showDisplacement) {
    ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.fillRect(curX, curY - 7 * sf, 8 * sf, 4 * sf);
    ctx.fillText('位移s⃗', curX + 11 * sf, curY);
    curX += 50 * sf;
  }

  if (vectorOptions.showVelocity) {
    ctx.fillStyle = isDark ? '#f43f5e' : '#dc2626';
    ctx.fillRect(curX, curY - 7 * sf, 8 * sf, 4 * sf);
    ctx.fillText('速度v⃗', curX + 11 * sf, curY);
    curX += 50 * sf;
  }

  if (vectorOptions.showAcceleration) {
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.fillRect(curX, curY - 7 * sf, 8 * sf, 4 * sf);
    ctx.fillText('加速度a⃗', curX + 11 * sf, curY);
  }

  ctx.restore();
}

export const CoordinateCanvas: React.FC<CoordinateCanvasProps> = ({
  xConfig,
  yConfig,
  observationMode,
  onObservationModeChange,
  vectorOptions,
  onVectorOptionsChange,
  currentTime,
  duration,
  onTimeChange,
  currentState,
  currentPresetId,
  currentPresetName,
  isRiverCrossingModel,
  onOpenDriveModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isRiverCrossing = Boolean(
    isRiverCrossingModel ||
    currentPresetId === 'river-crossing' ||
    (currentPresetName && currentPresetName.includes('小船渡河'))
  );

  const [ambientWaveTick, setAmbientWaveTick] = useState(0);

  // Subtle ambient wave ripple for river crossing model when time is static/paused
  useEffect(() => {
    if (!isRiverCrossing) return;
    const interval = setInterval(() => {
      setAmbientWaveTick((t) => (t + 1) % 1000);
    }, 50);
    return () => clearInterval(interval);
  }, [isRiverCrossing]);

  // Screen Display Theme: dark (high-tech oscilloscope) or light (classroom whiteboard)
  const [screenTheme, setScreenTheme] = useState<'dark' | 'light'>('dark');

  // Popover menus anchored behind the mode badge on screen bezel
  const [showObsModeMenu, setShowObsModeMenu] = useState(false);
  const [showVectorMenu, setShowVectorMenu] = useState(false);
  const obsModeMenuRef = useRef<HTMLDivElement>(null);
  const vectorMenuRef = useRef<HTMLDivElement>(null);

  // Click outside listener for the popover menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        obsModeMenuRef.current &&
        !obsModeMenuRef.current.contains(e.target as Node)
      ) {
        setShowObsModeMenu(false);
      }
      if (
        vectorMenuRef.current &&
        !vectorMenuRef.current.contains(e.target as Node)
      ) {
        setShowVectorMenu(false);
      }
    };
    if (showObsModeMenu || showVectorMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showObsModeMenu, showVectorMenu]);

  const activeVectorCount = [
    vectorOptions.showDisplacement,
    vectorOptions.showVelocity,
    vectorOptions.showAcceleration,
    vectorOptions.showParallelogram,
    vectorOptions.showTrajectory,
    vectorOptions.showStrobe,
  ].filter(Boolean).length;

  const handleToggleVectorOption = (key: keyof VectorDisplayOptions) => {
    if (!onVectorOptionsChange) return;
    onVectorOptionsChange({
      ...vectorOptions,
      [key]: !vectorOptions[key],
    });
  };

  const [view, setView] = useState<ViewTransform>({
    originX: 120,
    originY: 380,
    scale: 35,
  });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; initOriginX: number; initOriginY: number } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Snapshot modal states
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotResolution, setSnapshotResolution] = useState<1 | 2 | 3>(2);
  const [snapshotTheme, setSnapshotTheme] = useState<'paper' | 'dark'>('paper');
  const [includeBanner, setIncludeBanner] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [snapshotPreviewUrl, setSnapshotPreviewUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Google Drive upload states in snapshot modal
  const [driveUploadStatus, setDriveUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedDriveFile, setUploadedDriveFile] = useState<DriveFileItem | null>(null);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);

  // Touch interaction state tracking
  const touchStateRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    initOriginX: number;
    initOriginY: number;
    initDistance: number;
    initScale: number;
    centerWorldX: number;
    centerWorldY: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    initOriginX: 0,
    initOriginY: 0,
    initDistance: 0,
    initScale: 35,
    centerWorldX: 0,
    centerWorldY: 0,
  });

  // Auto-fit bounds calculation (Guarantees origin (0,0) and full trajectory are 100% visible with safe margins)
  const autoFitView = useCallback(() => {
    let w = 800;
    let h = 420;
    if (canvasRef.current && canvasRef.current.clientWidth > 0) {
      w = canvasRef.current.clientWidth;
      h = canvasRef.current.clientHeight;
    } else if (containerRef.current && containerRef.current.clientWidth > 0) {
      w = containerRef.current.clientWidth - 32;
      h = containerRef.current.clientHeight - 48;
    }
    if (w <= 0 || h <= 0) return;

    // Sample points along trajectory [0, duration]
    const samples = 50;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;

    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * duration;
      const st = calculateState(t, xConfig, yConfig, observationMode);
      minX = Math.min(minX, st.x);
      maxX = Math.max(maxX, st.x);
      minY = Math.min(minY, st.y);
      maxY = Math.max(maxY, st.y);
    }

    // Crucial: Must always include origin (0, 0) in the bounding box!
    const boundMinX = Math.min(0, minX);
    const boundMaxX = Math.max(0, maxX);
    const boundMinY = Math.min(0, minY);
    const boundMaxY = Math.max(0, maxY);

    const spanX = Math.max(boundMaxX - boundMinX, 2);
    const spanY = Math.max(boundMaxY - boundMinY, 2);

    const topMarginMeters = Math.max(3.5, spanY * 0.22);
    const bottomMarginMeters = Math.max(3, spanY * 0.18);
    const leftMarginMeters = Math.max(3, spanX * 0.2);
    const rightMarginMeters = Math.max(3, spanX * 0.2);

    const totalSpanX = spanX + leftMarginMeters + rightMarginMeters;
    const totalSpanY = spanY + topMarginMeters + bottomMarginMeters;

    const scaleX = w / totalSpanX;
    const scaleY = h / totalSpanY;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 4), 160);

    const newOriginX = Math.round(leftMarginMeters * newScale - boundMinX * newScale);
    const newOriginY = Math.round(topMarginMeters * newScale + boundMaxY * newScale);

    setView({
      originX: Math.max(60, Math.min(w - 60, newOriginX)),
      originY: Math.max(80, Math.min(h - 60, newOriginY)),
      scale: newScale,
    });
  }, [duration, xConfig, yConfig, observationMode]);

  // Recalculate view on preset or motion parameter change
  useEffect(() => {
    const timer = setTimeout(() => {
      autoFitView();
    }, 40);
    return () => clearTimeout(timer);
  }, [
    xConfig.v0,
    xConfig.a,
    xConfig.kind,
    yConfig.v0,
    yConfig.a,
    yConfig.kind,
    observationMode,
    duration,
    autoFitView,
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toWorld = useCallback(
    (px: number, py: number) => {
      return {
        x: (px - view.originX) / view.scale,
        y: (view.originY - py) / view.scale,
      };
    },
    [view]
  );

  // Mouse Interactivity: Pan & Trajectory Scrub
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPos = toWorld(mouseX, mouseY);
      let closestT = currentTime;
      let minDistance = 25 / view.scale;

      for (let step = 0; step <= 100; step++) {
        const testT = (step / 100) * duration;
        const testState = calculateState(testT, xConfig, yConfig, observationMode);
        const d = Math.hypot(testState.x - worldPos.x, testState.y - worldPos.y);
        if (d < minDistance) {
          minDistance = d;
          closestT = testT;
        }
      }

      if (minDistance < 20 / view.scale) {
        onTimeChange(closestT);
        return;
      }

      setIsPanning(true);
      panStartRef.current = {
        mouseX,
        mouseY,
        initOriginX: view.originX,
        initOriginY: view.originY,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && panStartRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const currentMouseX = e.clientX - rect.left;
      const currentMouseY = e.clientY - rect.top;
      const dx = currentMouseX - panStartRef.current.mouseX;
      const dy = currentMouseY - panStartRef.current.mouseY;

      setView((prev) => ({
        ...prev,
        originX: panStartRef.current!.initOriginX + dx,
        originY: panStartRef.current!.initOriginY + dy,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newScale = Math.max(1.5, Math.min(250, view.scale * zoomFactor));

    const worldX = (mouseX - view.originX) / view.scale;
    const worldY = (view.originY - mouseY) / view.scale;

    const newOriginX = mouseX - worldX * newScale;
    const newOriginY = mouseY + worldY * newScale;

    setView({
      originX: newOriginX,
      originY: newOriginY,
      scale: newScale,
    });
  };

  // Mobile Pinch-to-Zoom & Pan Gesture Support (优化平板触摸屏流畅度与稳定性)
  const viewRef = useRef(view);
  viewRef.current = view;

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const durationRef = useRef(duration);
  durationRef.current = duration;

  const xConfigRef = useRef(xConfig);
  xConfigRef.current = xConfig;

  const yConfigRef = useRef(yConfig);
  yConfigRef.current = yConfig;

  const observationModeRef = useRef(observationMode);
  observationModeRef.current = observationMode;

  const onTimeChangeRef = useRef(onTimeChange);
  onTimeChangeRef.current = onTimeChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      // Prevent browser default gesture scrolling / zooming
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const currentView = viewRef.current;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        const touchX = t.clientX - rect.left;
        const touchY = t.clientY - rect.top;

        const curScale = currentView.scale;
        const worldX = (touchX - currentView.originX) / curScale;
        const worldY = (currentView.originY - touchY) / curScale;

        // Check if user tapped directly on trajectory to scrub time
        let closestT = currentTimeRef.current;
        let minDistance = 30 / curScale;
        const curDuration = durationRef.current;

        for (let step = 0; step <= 80; step++) {
          const testT = (step / 80) * curDuration;
          const testState = calculateState(
            testT,
            xConfigRef.current,
            yConfigRef.current,
            observationModeRef.current
          );
          const d = Math.hypot(testState.x - worldX, testState.y - worldY);
          if (d < minDistance) {
            minDistance = d;
            closestT = testT;
          }
        }

        if (minDistance < 24 / curScale) {
          onTimeChangeRef.current(closestT);
          touchStateRef.current.mode = 'none';
          return;
        }

        touchStateRef.current = {
          mode: 'pan',
          startX: touchX,
          startY: touchY,
          initOriginX: currentView.originX,
          initOriginY: currentView.originY,
          initDistance: 0,
          initScale: currentView.scale,
          centerWorldX: 0,
          centerWorldY: 0,
        };
      } else if (e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const x1 = t1.clientX - rect.left;
        const y1 = t1.clientY - rect.top;
        const x2 = t2.clientX - rect.left;
        const y2 = t2.clientY - rect.top;

        const dist = Math.hypot(x2 - x1, y2 - y1);
        const curScale = currentView.scale;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        touchStateRef.current = {
          mode: 'pinch',
          startX: midX,
          startY: midY,
          initOriginX: currentView.originX,
          initOriginY: currentView.originY,
          initDistance: Math.max(10, dist),
          initScale: curScale,
          centerWorldX: (midX - currentView.originX) / curScale,
          centerWorldY: (currentView.originY - midY) / curScale,
        };
      }
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const st = touchStateRef.current;

      if (e.touches.length === 1 && st.mode === 'pan') {
        const t = e.touches[0];
        const touchX = t.clientX - rect.left;
        const touchY = t.clientY - rect.top;
        const dx = touchX - st.startX;
        const dy = touchY - st.startY;

        setView((prev) => ({
          ...prev,
          originX: st.initOriginX + dx,
          originY: st.initOriginY + dy,
        }));
      } else if (e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const x1 = t1.clientX - rect.left;
        const y1 = t1.clientY - rect.top;
        const x2 = t2.clientX - rect.left;
        const y2 = t2.clientY - rect.top;

        const currentDist = Math.hypot(x2 - x1, y2 - y1);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        if (st.mode !== 'pinch' || st.initDistance < 5) {
          // Transitions from single finger to pinch seamlessly
          const curView = viewRef.current;
          touchStateRef.current = {
            mode: 'pinch',
            startX: midX,
            startY: midY,
            initOriginX: curView.originX,
            initOriginY: curView.originY,
            initDistance: Math.max(10, currentDist),
            initScale: curView.scale,
            centerWorldX: (midX - curView.originX) / curView.scale,
            centerWorldY: (curView.originY - midY) / curView.scale,
          };
          return;
        }

        const pinchRatio = currentDist / st.initDistance;
        const newScale = Math.max(1.5, Math.min(250, st.initScale * pinchRatio));

        const newOriginX = midX - st.centerWorldX * newScale;
        const newOriginY = midY + st.centerWorldY * newScale;

        setView({
          originX: newOriginX,
          originY: newOriginY,
          scale: newScale,
        });
      }
    };

    const onNativeTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        touchStateRef.current.mode = 'none';
      } else if (e.touches.length === 1) {
        // Drop from pinch to pan with remaining finger
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const curView = viewRef.current;
        touchStateRef.current = {
          mode: 'pan',
          startX: t.clientX - rect.left,
          startY: t.clientY - rect.top,
          initOriginX: curView.originX,
          initOriginY: curView.originY,
          initDistance: 0,
          initScale: curView.scale,
          centerWorldX: 0,
          centerWorldY: 0,
        };
      }
    };

    canvas.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    canvas.addEventListener('touchend', onNativeTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onNativeTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onNativeTouchStart);
      canvas.removeEventListener('touchmove', onNativeTouchMove);
      canvas.removeEventListener('touchend', onNativeTouchEnd);
      canvas.removeEventListener('touchcancel', onNativeTouchEnd);
    };
  }, []);

  // Main On-Screen Drawing Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const isDark = screenTheme === 'dark';

    ctx.save();
    ctx.scale(dpr, dpr);

    // Surface Background
    ctx.fillStyle = isDark ? '#060a12' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Draw coordinate scene
    drawSceneToContext({
      ctx,
      w,
      h,
      scaleFactor: 1,
      originX: view.originX,
      originY: view.originY,
      scale: view.scale,
      isDark,
      xConfig,
      yConfig,
      observationMode,
      vectorOptions,
      currentTime,
      duration,
      currentState,
      isRiverCrossing,
      ambientTick: ambientWaveTick,
    });

    ctx.restore();
  }, [
    view,
    currentTime,
    duration,
    xConfig,
    yConfig,
    observationMode,
    vectorOptions,
    currentState,
    screenTheme,
    isRiverCrossing,
    ambientWaveTick,
  ]);

  // High-Resolution Snapshot Generator
  const generateSnapshotCanvas = useCallback(
    (
      resScale: number,
      theme: 'paper' | 'dark',
      withBanner: boolean,
      withLegend: boolean
    ): HTMLCanvasElement => {
      const baseW = canvasRef.current?.clientWidth || 800;
      const baseH = canvasRef.current?.clientHeight || 420;
      const bannerHeight = withBanner ? 60 : 0;

      const totalW = Math.round(baseW * resScale);
      const totalH = Math.round((baseH + bannerHeight) * resScale);

      const offCanvas = document.createElement('canvas');
      offCanvas.width = totalW;
      offCanvas.height = totalH;
      const ctx = offCanvas.getContext('2d')!;

      const isDark = theme === 'dark';

      // Background
      ctx.fillStyle = isDark ? '#060a12' : '#ffffff';
      ctx.fillRect(0, 0, totalW, totalH);

      // Top Educational Banner for Handouts/Notes
      if (withBanner) {
        const bH = Math.round(bannerHeight * resScale);
        ctx.fillStyle = isDark ? '#0b1120' : '#f8fafc';
        ctx.fillRect(0, 0, totalW, bH);
        ctx.strokeStyle = isDark ? '#1e293b' : '#cbd5e1';
        ctx.lineWidth = Math.max(1, Math.round(1.5 * resScale));
        ctx.beginPath();
        ctx.moveTo(0, bH);
        ctx.lineTo(totalW, bH);
        ctx.stroke();

        // Title
        ctx.font = `bold ${Math.round(14 * resScale)}px sans-serif`;
        ctx.fillStyle = isDark ? '#38bdf8' : '#1e3a8a';
        const title = `高中物理必修二 · 运动的合成与分解演示实验 ${
          currentPresetName ? `【${currentPresetName}】` : ''
        }`;
        ctx.fillText(title, Math.round(18 * resScale), Math.round(25 * resScale));

        // Subtitle / Physics instantaneous metadata
        ctx.font = `bold ${Math.round(10.5 * resScale)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
        const sub = `时间 t = ${currentTime.toFixed(2)}s / ${duration.toFixed(1)}s  |  合位移 s = ${currentState.s.toFixed(
          2
        )}m (θs=${currentState.sAngleDeg.toFixed(1)}°)  |  合速度 v = ${currentState.v.toFixed(
          2
        )}m/s (θv=${currentState.vAngleDeg.toFixed(1)}°)  |  合加速度 a = ${currentState.a.toFixed(2)}m/s²`;
        ctx.fillText(sub, Math.round(18 * resScale), Math.round(46 * resScale));
      }

      // Draw coordinate scene at high resolution
      drawSceneToContext({
        ctx,
        w: totalW,
        h: Math.round(baseH * resScale),
        scaleFactor: resScale,
        originX: view.originX * resScale,
        originY: (view.originY + bannerHeight) * resScale,
        scale: view.scale * resScale,
        isDark,
        xConfig,
        yConfig,
        observationMode,
        vectorOptions,
        currentTime,
        duration,
        currentState,
        bannerOffsetTop: bannerHeight * resScale,
        isRiverCrossing,
        ambientTick: ambientWaveTick,
      });

      // Optional legend box
      if (withLegend) {
        drawLegendBox(
          ctx,
          totalW,
          resScale,
          isDark,
          bannerHeight * resScale,
          vectorOptions,
          observationMode
        );
      }

      return offCanvas;
    },
    [
      view,
      currentTime,
      duration,
      xConfig,
      yConfig,
      observationMode,
      vectorOptions,
      currentState,
      currentPresetName,
      isRiverCrossing,
      ambientWaveTick,
    ]
  );

  // Update snapshot preview whenever modal settings change
  useEffect(() => {
    if (!showSnapshotModal) {
      setSnapshotPreviewUrl(null);
      return;
    }

    try {
      const snapCanvas = generateSnapshotCanvas(
        snapshotResolution,
        snapshotTheme,
        includeBanner,
        includeLegend
      );
      const url = snapCanvas.toDataURL('image/png');
      setSnapshotPreviewUrl(url);
    } catch {
      // Fallback
    }
  }, [
    showSnapshotModal,
    snapshotResolution,
    snapshotTheme,
    includeBanner,
    includeLegend,
    generateSnapshotCanvas,
  ]);

  // Download Snapshot Image
  const handleDownloadSnapshot = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const snapCanvas = generateSnapshotCanvas(
          snapshotResolution,
          snapshotTheme,
          includeBanner,
          includeLegend
        );

        snapCanvas.toBlob((blob) => {
          if (!blob) {
            setIsExporting(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const safeName = currentPresetName
            ? currentPresetName.replace(/\s+/g, '_')
            : '运动轨迹仿真';
          link.download = `物理运动合成与分解_${safeName}_t${currentTime.toFixed(2)}s_${snapshotResolution}x.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          setIsExporting(false);
        }, 'image/png');
      } catch {
        setIsExporting(false);
      }
    }, 50);
  };

  // Copy Snapshot to Clipboard
  const handleCopySnapshot = async () => {
    try {
      const snapCanvas = generateSnapshotCanvas(
        snapshotResolution,
        snapshotTheme,
        includeBanner,
        includeLegend
      );

      snapCanvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
          } catch {
            // Fallback: direct download
            handleDownloadSnapshot();
          }
        } else {
          handleDownloadSnapshot();
        }
      }, 'image/png');
    } catch {
      handleDownloadSnapshot();
    }
  };

  // Upload Snapshot directly to Google Drive
  const handleUploadToDrive = async () => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      } catch (err: any) {
        setDriveUploadError(err.message || '请先登录 Google 账号以访问云端硬盘');
        setDriveUploadStatus('error');
        return;
      }
    }

    if (!token) return;

    setDriveUploadStatus('uploading');
    setDriveUploadError(null);
    try {
      const snapCanvas = generateSnapshotCanvas(
        snapshotResolution,
        snapshotTheme,
        includeBanner,
        includeLegend
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        snapCanvas.toBlob((b) => resolve(b), 'image/png')
      );

      if (!blob) throw new Error('生成快照图片数据失败');

      const safeName = currentPresetName
        ? `物理实验_${currentPresetName}_轨迹快照_t${currentTime.toFixed(2)}s`
        : `物理实验_轨迹快照_t${currentTime.toFixed(2)}s`;

      const file = await uploadImageToDrive({
        imageBlob: blob,
        fileName: `${safeName}.png`,
        accessToken: token,
        description: `高中物理运动轨迹快照: ${currentPresetName || '自定义运动'} (t=${currentTime.toFixed(2)}s)`,
      });

      setUploadedDriveFile(file);
      setDriveUploadStatus('success');
    } catch (err: any) {
      console.error('Drive upload error:', err);
      setDriveUploadError(err.message || '保存到 Google 云端硬盘失败');
      setDriveUploadStatus('error');
    }
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.8)] p-2 sm:p-3">
      {/* 
        High-Tech Lab Monitor Top Bezel (现代科技仪器大屏硬件顶框与装饰螺栓)
      */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-t-xl text-xs select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        {/* Left: 仪器硬件铆钉 + 状态指示 + 模式铭牌 */}
        <div className="flex items-center gap-2.5">
          <div className="screw-head shrink-0 hidden sm:block" />

          {/* Pilot Power LED Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/60 border border-slate-700 rounded-md shadow-inner">
            <span
              className={`w-2 h-2 rounded-full ${
                observationMode === 'both'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                  : observationMode === 'only_x'
                  ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                  : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              }`}
            ></span>
            <span className="font-mono text-[10px] tracking-widest text-slate-300 font-bold uppercase">
              CRT·SCREEN
            </span>
          </div>

          {/* Mode Badge with 3D tactile bevel */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 rounded-md font-bold text-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.4)]">
            <span>
              {observationMode === 'both'
                ? '二维平面合运动 (合成与分解)'
                : observationMode === 'only_x'
                ? '仅观察 X 轴方向分运动'
                : '仅观察 Y 轴方向分运动'}
            </span>
          </div>

          {/* 小船渡河专属状态徽章 */}
          {isRiverCrossing && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-b from-sky-900/90 to-blue-950/90 border border-sky-400/70 rounded-md font-bold text-sky-200 text-[11px] shadow-[0_0_10px_rgba(14,165,233,0.3)]">
              <span className="text-xs">🌊</span>
              <span>小船渡河航道 (水流沿X轴 · 船头指Y轴)</span>
            </div>
          )}

          {/* 按键 1：运动观察模式 (内嵌设置面板) */}
          <div className="relative" ref={obsModeMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowObsModeMenu((s) => !s);
                setShowVectorMenu(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-extrabold text-[11px] transition-all cursor-pointer border select-none ${
                showObsModeMenu
                  ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.6)] translate-y-0.5'
                  : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-cyan-300 border-slate-600 hover:border-cyan-400/70 shadow-[0_2px_0_#0f172a,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-0.5'
              }`}
              title="设置运动观察模式（合运动 / X轴分运动 / Y轴分运动 / 三球联动）"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>运动观察模式</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                  showObsModeMenu ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* 运动观察模式下拉浮窗面板 */}
            {showObsModeMenu && (
              <div className="absolute top-full left-0 mt-2 z-50 w-80 sm:w-96 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-blue-500/70 rounded-2xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(37,99,235,0.25)] text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-blue-600 text-white shadow-xs">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-100">
                      运动观察模式设置
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowObsModeMenu(false)}
                    className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 pt-2.5">
                  {/* 同时参与两运动 (合运动) */}
                  <button
                    type="button"
                    onClick={() => {
                      onObservationModeChange?.('both');
                    }}
                    className={`w-full flex items-start justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      observationMode === 'both'
                        ? 'bg-blue-950/80 border-2 border-blue-400 text-white shadow-[0_2px_8px_rgba(37,99,235,0.4)]'
                        : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        同时参与两运动 (合运动)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        质点在直角坐标系中的实际运动轨迹
                      </p>
                    </div>
                    {observationMode === 'both' && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                  </button>

                  {/* 仅在 X 轴上运动 */}
                  <button
                    type="button"
                    onClick={() => {
                      onObservationModeChange?.('only_x');
                    }}
                    className={`w-full flex items-start justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      observationMode === 'only_x'
                        ? 'bg-emerald-950/80 border-2 border-emerald-400 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        仅在 X 轴上运动 (分运动 1)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        水平方向独立分运动 (y 恒为 0)
                      </p>
                    </div>
                    {observationMode === 'only_x' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>

                  {/* 仅在 Y 轴上运动 */}
                  <button
                    type="button"
                    onClick={() => {
                      onObservationModeChange?.('only_y');
                    }}
                    className={`w-full flex items-start justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      observationMode === 'only_y'
                        ? 'bg-amber-950/80 border-2 border-amber-400 text-white shadow-[0_2px_8px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        仅在 Y 轴上运动 (分运动 2)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        竖直方向独立分运动 (x 恒为 0)
                      </p>
                    </div>
                    {observationMode === 'only_y' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                </div>

                {/* 三球联动投影开关 */}
                {observationMode === 'both' && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-slate-800 cursor-pointer select-none">
                      <div className="flex items-center gap-2">
                        <SplitSquareVertical className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            三球联动：轴上投影小球
                          </div>
                          <div className="text-[10px] text-slate-400">
                            在 X/Y 轴显示分运动投影及虚线矩形
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={vectorOptions.showProjections}
                        onChange={(e) => {
                          onVectorOptionsChange?.({
                            ...vectorOptions,
                            showProjections: e.target.checked,
                          });
                        }}
                        className="w-4 h-4 rounded text-blue-500 accent-blue-500 cursor-pointer"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 按键 2：矢量合成与分解选项 (内嵌设置面板) */}
          <div className="relative" ref={vectorMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowVectorMenu((s) => !s);
                setShowObsModeMenu(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-extrabold text-[11px] transition-all cursor-pointer border select-none ${
                showVectorMenu
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.6)] translate-y-0.5'
                  : 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-indigo-300 border-slate-600 hover:border-indigo-400/70 shadow-[0_2px_0_#0f172a,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-0.5'
              }`}
              title="设置矢量合成与分解选项（位移/速度/加速度矢量、平行四边形定则、轨迹、频闪）"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>矢量合成与分解选项</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/60 rounded text-cyan-300 font-mono font-bold">
                {activeVectorCount}项
              </span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                  showVectorMenu ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* 矢量合成与分解下拉浮窗面板 */}
            {showVectorMenu && (
              <div className="absolute top-full left-0 mt-2 z-50 w-80 sm:w-[420px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-500/70 rounded-2xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(99,102,241,0.25)] text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-xs">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-100">
                      矢量合成与分解 · 叠加标绘选项
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">
                      已启用 {activeVectorCount}/6 项
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowVectorMenu(false)}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5">
                  {/* 1. 位移 */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                    vectorOptions.showDisplacement
                      ? 'bg-sky-950/70 border-sky-400/80 text-white shadow-xs'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={vectorOptions.showDisplacement}
                      onChange={() => handleToggleVectorOption('showDisplacement')}
                      className="mt-0.5 rounded text-sky-500 accent-sky-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="w-2.5 h-1 bg-sky-400 rounded-xs shadow-[0_0_4px_#38bdf8]"></span>
                        位移矢量 (s⃗)
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        含分位移 sx, sy
                      </p>
                    </div>
                  </label>

                  {/* 2. 速度 */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                    vectorOptions.showVelocity
                      ? 'bg-rose-950/70 border-rose-400/80 text-white shadow-xs'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={vectorOptions.showVelocity}
                      onChange={() => handleToggleVectorOption('showVelocity')}
                      className="mt-0.5 rounded text-rose-500 accent-rose-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="w-2.5 h-1 bg-rose-500 rounded-xs shadow-[0_0_4px_#f43f5e]"></span>
                        某一时刻速度 (v⃗)
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        瞬时切线合速度及 vx, vy
                      </p>
                    </div>
                  </label>

                  {/* 3. 加速度 */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                    vectorOptions.showAcceleration
                      ? 'bg-amber-950/70 border-amber-400/80 text-white shadow-xs'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={vectorOptions.showAcceleration}
                      onChange={() => handleToggleVectorOption('showAcceleration')}
                      className="mt-0.5 rounded text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="w-2.5 h-1 bg-amber-400 rounded-xs shadow-[0_0_4px_#fbbf24]"></span>
                        加速度矢量 (a⃗)
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        合加速度及两轴分加速度 ax, ay
                      </p>
                    </div>
                  </label>

                  {/* 4. 平行四边形定则 */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                    vectorOptions.showParallelogram
                      ? 'bg-blue-950/70 border-blue-400/80 text-white shadow-xs'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={vectorOptions.showParallelogram}
                      onChange={() => handleToggleVectorOption('showParallelogram')}
                      className="mt-0.5 rounded text-blue-500 accent-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Grid className="w-3 h-3 text-blue-400" />
                        平行四边形定则
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        几何闭合辅助线
                      </p>
                    </div>
                  </label>

                  {/* 5. 轨迹曲线 */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                    vectorOptions.showTrajectory
                      ? 'bg-cyan-950/70 border-cyan-400/80 text-white shadow-xs'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={vectorOptions.showTrajectory}
                      onChange={() => handleToggleVectorOption('showTrajectory')}
                      className="mt-0.5 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Route className="w-3 h-3 text-cyan-400" />
                        合运动轨迹线
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        连续空间轨迹路径
                      </p>
                    </div>
                  </label>

                  {/* 6. 频闪打点 */}
                  <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                    vectorOptions.showStrobe
                      ? 'bg-emerald-950/70 border-emerald-400/80 text-white shadow-xs'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={vectorOptions.showStrobe}
                      onChange={() => handleToggleVectorOption('showStrobe')}
                      className="mt-0.5 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Camera className="w-3 h-3 text-emerald-400" />
                        频闪打点痕迹
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        等时点阵（Δt = 0.5s）
                      </p>
                    </div>
                  </label>
                </div>

                {/* 底部快捷控制 */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    屏幕中央实时动态标绘
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onVectorOptionsChange?.({
                          ...vectorOptions,
                          showDisplacement: true,
                          showVelocity: true,
                          showAcceleration: true,
                          showParallelogram: true,
                          showTrajectory: true,
                          showStrobe: true,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 cursor-pointer"
                    >
                      全部开启
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onVectorOptionsChange?.({
                          ...vectorOptions,
                          showDisplacement: true,
                          showVelocity: true,
                          showAcceleration: false,
                          showParallelogram: false,
                          showTrajectory: true,
                          showStrobe: false,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-[10px] border border-slate-700 cursor-pointer"
                    >
                      默认精简
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: 荧光OLED数字时钟 + 矢量图例 + 拍照快照 + 屏幕模式切换 + 3D立体缩放按钮 */}
        <div className="flex items-center gap-2">
          {/* 矢量图例 (立体深色科技铭牌) */}
          <div className="flex items-center gap-2 py-1 px-2.5 bg-black/70 border border-slate-700/80 rounded-md text-[11px] text-slate-200 shadow-inner">
            <span className="font-bold text-slate-400 font-mono text-[10px]">图例:</span>
            {vectorOptions.showDisplacement && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-sky-400 rounded-xs shadow-[0_0_4px_#38bdf8]"></span>
                <span className="text-slate-200">位移 <strong className="font-mono text-sky-400">s⃗</strong></span>
              </span>
            )}
            {vectorOptions.showVelocity && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-rose-500 rounded-xs shadow-[0_0_4px_#f43f5e]"></span>
                <span className="text-slate-200">速度 <strong className="font-mono text-rose-400">v⃗</strong></span>
              </span>
            )}
            {vectorOptions.showAcceleration && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-amber-400 rounded-xs shadow-[0_0_4px_#fbbf24]"></span>
                <span className="text-slate-200">加速度 <strong className="font-mono text-amber-400">a⃗</strong></span>
              </span>
            )}
            {vectorOptions.showProjections && observationMode === 'both' && (
              <span className="hidden md:flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]"></span>
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_4px_#fbbf24]"></span>
                <span className="text-slate-300">投影</span>
              </span>
            )}
          </div>

          {/* 实时高精 OLED 数字表 (绿字黑底荧光显影) */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-black border border-emerald-950 rounded-md font-mono font-bold text-emerald-400 text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_0_8px_rgba(16,185,129,0.2)] tracking-wider">
            <span>t = {currentTime.toFixed(2)}s</span>
            <span className="text-emerald-700 font-normal">/ {duration.toFixed(1)}s</span>
          </div>

          {/* 📸 高清快照按钮 (专为讲义备课与笔记截图设计) */}
          <button
            type="button"
            onClick={() => {
              setDriveUploadStatus('idle');
              setUploadedDriveFile(null);
              setDriveUploadError(null);
              setShowSnapshotModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border border-blue-400/80 shadow-[0_2px_0_#1e3a8a,0_2px_6px_rgba(37,99,235,0.4)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer font-bold text-[11px]"
            title="拍摄当前运动轨迹高清快照 (用于教案备课、课堂讲义或电子笔记插图)"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">高清快照</span>
          </button>

          {/* ☁️ Google 云端硬盘实验存档按钮 */}
          {onOpenDriveModal && (
            <button
              type="button"
              onClick={onOpenDriveModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white border border-emerald-400/80 shadow-[0_2px_0_#064e3b,0_2px_6px_rgba(16,185,129,0.4)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer font-bold text-[11px]"
              title="打开 Google 云端硬盘实验档案库 (备份实验、云端漫游、提取教案)"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">云端实验库</span>
            </button>
          )}

          {/* 屏幕模式切换键 (示波器夜光 / 白板高亮) */}
          <button
            type="button"
            onClick={() => setScreenTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 text-slate-200 border border-slate-600 shadow-[0_2px_0_#1e293b,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer font-bold text-[11px]"
            title={screenTheme === 'dark' ? '切换为教室白板高光模式' : '切换为示波器深邃荧光模式'}
          >
            {screenTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">高光屏</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">示波屏</span>
              </>
            )}
          </button>

          {/* 科技说明按钮 (立体浮雕键) */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 text-slate-200 border border-slate-600 shadow-[0_2px_0_#1e293b,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            title="查看此两个窗口的功能说明与使用指南"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold hidden sm:inline">说明</span>
          </button>

          {/* 立体质感缩放键盘 (3D Tactile Buttons) */}
          <div className="flex items-center gap-1 bg-black/60 border border-slate-700/80 rounded-md p-0.5 shadow-inner">
            <button
              onClick={() => setView((v) => ({ ...v, scale: Math.min(250, v.scale * 1.3) }))}
              className="px-2 py-1 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 text-slate-100 border border-slate-600 shadow-[0_2px_0_#1e293b] active:shadow-none active:translate-y-0.5 rounded transition-all cursor-pointer font-bold text-xs"
              title="放大坐标系 (支持滚轮或双指张开)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView((v) => ({ ...v, scale: Math.max(1.5, v.scale * 0.75) }))}
              className="px-2 py-1 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 text-slate-100 border border-slate-600 shadow-[0_2px_0_#1e293b] active:shadow-none active:translate-y-0.5 rounded transition-all cursor-pointer font-bold text-xs"
              title="缩小坐标系 (支持滚轮或双指捏合)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={autoFitView}
              className="px-2 py-1 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:from-slate-800 active:to-slate-900 text-cyan-300 border border-slate-600 shadow-[0_2px_0_#1e293b] active:shadow-none active:translate-y-0.5 rounded transition-all cursor-pointer font-bold text-xs"
              title="重置居中并自适应完整轨迹"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="screw-head shrink-0 hidden sm:block" />
        </div>
      </div>

      {/* 
        High-Tech Lab Monitor Display Panel:
        搭配 CSS transform 和 Padding (paddingTop: 28px)，确保原点始终居内
      */}
      <div
        ref={containerRef}
        className={`relative flex-1 w-full min-h-0 overflow-hidden select-none rounded-b-xl border-x-2 border-b-2 border-slate-700/80 shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)] touch-none pt-7 pb-3 px-4 ${
          screenTheme === 'dark' ? 'bg-[#060a12]' : 'bg-[#f8fafc]'
        }`}
        style={{
          paddingTop: '28px',
          paddingBottom: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        <div className="screen-glass-sheen" />

        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full block cursor-crosshair touch-none select-none"
            style={{
              touchAction: 'none',
              transform: 'translateZ(0)',
            }}
          />
        </div>
      </div>

      {/* 
        教学功能与使用说明弹窗
      */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-slate-700 max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  坐标系状态指示窗与矢量图例标识 · 功能与使用说明
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-blue-500/30 space-y-1.5 shadow-inner">
                <div className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                  小窗口 1：【当前运动模式与交互状态指示】
                </div>
                <p>
                  <strong>功能是什么：</strong>
                  实时反映质点当前参与的是“平面二维合运动”，还是单独的“X 轴分运动”或“Y 轴分运动”。同时提示该坐标系支持直观的鼠标及触控手势交互。
                </p>
                <div className="text-slate-300">
                  <strong>课堂怎么用：</strong>
                  <ul className="list-disc list-inside space-y-1 mt-1 text-slate-400">
                    <li>
                      <strong>看模式：</strong>在下方切换观察模式时，上方状态栏实时变色联动，提醒学生关注“此时观察的是合运动还是某个分运动”。
                    </li>
                    <li>
                      <strong>滚轮/双指缩放：</strong>鼠标在画布上滑动滚轮，或移动端双指张开/捏合，可放大微观细节或缩小宏观轨迹全貌。
                    </li>
                    <li>
                      <strong>拖拽平移：</strong>按住鼠标左键或单指拖动画布任意空白区域，可自由平移坐标原点与视野中心。
                    </li>
                    <li>
                      <strong>轨迹点击定位（教学重点）：</strong>鼠标在轨迹线上任意位置轻轻一点，系统即刻将时间精确定格在所选瞬间，立刻展示该位置的位移、切线速度与加速度分解！
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-indigo-500/30 space-y-1.5 shadow-inner">
                <div className="font-bold text-indigo-400 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]"></span>
                  小窗口 2：【矢量图例标识】
                </div>
                <p>
                  <strong>功能是什么：</strong>
                  严格遵循高中物理矢量规范，通过色彩编码区分位移矢量、速度矢量与加速度矢量，防止在直角坐标系中多个矢量重叠时学生产生混淆。
                </p>
                <div className="text-slate-300">
                  <strong>颜色对照与教学意义：</strong>
                  <ul className="list-disc list-inside space-y-1 mt-1 text-slate-400">
                    <li>
                      <strong className="text-sky-400">天蓝色 (s⃗)：</strong>
                      位移矢量。始于原点 O(0,0)，终点为当前质点位置，直观呈现合位移与两个分位移的平行四边形法则。
                    </li>
                    <li>
                      <strong className="text-rose-400">红色 (v⃗)：</strong>
                      瞬时速度矢量。始于质点，方向<strong>始终严格沿轨迹切线方向</strong>，水平向右为 vx，竖直方向为 vy。
                    </li>
                    <li>
                      <strong className="text-amber-400">金黄色 (a⃗)：</strong>
                      加速度矢量。始于质点，例如平抛运动中合加速度竖直向下恒定（自由落体重力加速度 g）。
                    </li>
                    <li>
                      <strong className="text-emerald-400">绿点 / 橙点：</strong>
                      X 轴与 Y 轴上的投影小球，生动演示“各分运动具有独立性与等时性”。
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-2.5 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400 text-[11px]">
                💡 <strong>现代科技大屏说明：</strong>
                这两个小窗口现已集成在坐标系科技外框顶部的专用工具条中，完全移出了坐标系画布内部，绝对不会遮挡 X/Y 坐标轴、坐标刻度及小球的运动轨迹！
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs shadow-[0_3px_0_#1e3a8a] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                我知道了，返回演示
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        📸 运动轨迹高清快照生成器弹窗 (专为教案、课堂讲义、多媒体课件与学生电子笔记设计)
      */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-2 border-slate-700/80 max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.5)]">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm tracking-tight flex items-center gap-2">
                    运动轨迹高清快照生成器
                    <span className="text-[10px] bg-blue-950 text-cyan-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                      讲义 · 课件 · 电子笔记
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    一键导出包含高精度直角坐标系、合运动轨迹与瞬时物理量的超清图片
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Snapshot Preview Card */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span className="font-bold flex items-center gap-1.5">
                  <FileImage className="w-3.5 h-3.5 text-cyan-400" />
                  快照预览 (真实导出效果)
                </span>
                <span className="font-mono text-[11px]">
                  分辨率: {snapshotResolution === 1 ? '1× (标准 1080P)' : snapshotResolution === 2 ? '2× (讲义超清 2K+)' : '3× (出版印刷级 300DPI)'}
                </span>
              </div>

              <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-2 shadow-inner">
                {snapshotPreviewUrl ? (
                  <img
                    src={snapshotPreviewUrl}
                    alt="轨迹高清快照预览"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-800"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Sparkles className="w-4 h-4 animate-spin-slow text-blue-500" />
                    <span>正在渲染超清快照预览...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Export Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Option 1: Handout Style / Background Theme */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  导出版式与底色
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSnapshotTheme('paper')}
                    className={`py-1.5 px-2 rounded-md font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      snapshotTheme === 'paper'
                        ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_2px_6px_rgba(37,99,235,0.4)] border-t border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>白底讲义印刷版</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSnapshotTheme('dark')}
                    className={`py-1.5 px-2 rounded-md font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      snapshotTheme === 'dark'
                        ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_2px_6px_rgba(37,99,235,0.4)] border-t border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>示波器暗黑科技版</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {snapshotTheme === 'paper'
                    ? '纯白底色、深色高对比度坐标轴，适合黑白或彩色纸质讲义打印与试卷排版。'
                    : '黑底荧光霓虹轨迹，适合 PowerPoint 课件、电子白板及夜间数字笔记。'}
                </p>
              </div>

              {/* Option 2: Image Resolution Multiplier */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  图像清晰度 (分辨率)
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/60 rounded-lg border border-slate-800 text-xs font-mono">
                  {[1, 2, 3].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setSnapshotResolution(res as 1 | 2 | 3)}
                      className={`py-1.5 px-2 rounded-md font-bold transition-all cursor-pointer ${
                        snapshotResolution === res
                          ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_2px_6px_rgba(37,99,235,0.4)] border-t border-blue-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {res}× {res === 1 ? '标准' : res === 2 ? '超清' : '极清'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  推荐选择 <strong>2× 讲义超清</strong>（约 2000+ 像素宽），在 Word 或试卷中缩放不失真。
                </p>
              </div>
            </div>

            {/* Checkbox Annotation Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBanner}
                  onChange={(e) => setIncludeBanner(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 accent-blue-500 cursor-pointer"
                />
                <span className="font-bold text-slate-200">
                  包含教学实验题头与瞬时物理量注脚 (时间t、位移s、速度v、加速度a)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLegend}
                  onChange={(e) => setIncludeLegend(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 accent-blue-500 cursor-pointer"
                />
                <span className="font-bold text-slate-200">
                  包含右上角矢量色彩图例 (s⃗天蓝、v⃗红色、a⃗金黄)
                </span>
              </label>
            </div>

            {/* Google Drive Upload Feedback Banner */}
            {driveUploadStatus === 'success' && uploadedDriveFile && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs flex items-center justify-between gap-2 text-emerald-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    已成功上传至 Google 云端硬盘「<strong>物理运动合成与分解实验课件</strong>」！
                  </span>
                </div>
                {uploadedDriveFile.webViewLink && (
                  <a
                    href={uploadedDriveFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>在 Drive 中查看</span>
                  </a>
                )}
              </div>
            )}

            {driveUploadStatus === 'error' && driveUploadError && (
              <div className="p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-xs text-rose-300">
                {driveUploadError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>💡 提示：支持本地复制、高清下载或一键同步至 Google 云端硬盘！</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Save to Google Drive button */}
                <button
                  type="button"
                  onClick={handleUploadToDrive}
                  disabled={driveUploadStatus === 'uploading'}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white text-xs font-bold border-t border-emerald-400/60 shadow-[0_2px_0_#064e3b,0_2px_8px_rgba(16,185,129,0.3)] active:translate-y-0.5 cursor-pointer"
                  title="直接上传该超清快照至 Google 云端硬盘"
                >
                  <Cloud className="w-4 h-4 text-emerald-200" />
                  <span>
                    {driveUploadStatus === 'uploading' ? '正在保存到 Drive...' : '保存至 Google Drive'}
                  </span>
                </button>

                {/* Copy to clipboard button */}
                <button
                  type="button"
                  onClick={handleCopySnapshot}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.5)]'
                      : 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-100 border-slate-600 shadow-[0_2px_0_#1e293b] active:translate-y-0.5'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>已复制到剪贴板！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-cyan-300" />
                      <span>复制到剪贴板</span>
                    </>
                  )}
                </button>

                {/* Download PNG image button */}
                <button
                  type="button"
                  onClick={handleDownloadSnapshot}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white text-xs font-extrabold border-t border-blue-400 shadow-[0_3px_0_#1e3a8a,0_4px_12px_rgba(37,99,235,0.4)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>{isExporting ? '生成中...' : '下载高清 PNG'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
