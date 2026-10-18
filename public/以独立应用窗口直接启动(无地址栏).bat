@echo off
chcp 65001 >nul
title 运动的合成与分解演示实验室 - 独立应用窗口启动器
cd /d "%~dp0"

echo =====================================================================
echo    高中物理：运动的合成与分解可视化仿真实验室 (独立应用窗口模式)
echo =====================================================================
echo 模式特征：
echo   1. 彻底隐藏浏览器地址栏、标签栏与前进/后退工具栏。
echo   2. 像普通桌面软件一样运行，顶部右上角仅保留最小化、最大化、关闭三个按钮。
echo   3. 采用免服务器单文件版，断网离线秒开，支持电子白板触控。
echo.
echo 正在为您唤起独立应用窗口...

:: 1. 优先尝试使用 Microsoft Edge 独立应用模式启动
if exist "%~dp0单文件无需服务器_双击即开.html" (
    start msedge.exe --app="file:///%~dp0单文件无需服务器_双击即开.html" 2>nul
    if %errorlevel% equ 0 exit
    
    :: 2. 次选尝试 Google Chrome 独立应用模式启动
    start chrome.exe --app="file:///%~dp0单文件无需服务器_双击即开.html" 2>nul
    if %errorlevel% equ 0 exit
    
    :: 3. 备选：系统默认关联直接打开
    start "" "%~dp0单文件无需服务器_双击即开.html"
    exit
)

:: 若未找到单文件版，尝试启动 index.html
start msedge.exe --app="%~dp0index.html" 2>nul
if %errorlevel% equ 0 exit

start chrome.exe --app="%~dp0index.html" 2>nul
if %errorlevel% equ 0 exit

start "" "%~dp0index.html"
exit
