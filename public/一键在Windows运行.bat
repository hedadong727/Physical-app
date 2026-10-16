@echo off
chcp 65001 >nul
title 运动的合成与分解演示实验室 - 本地离线启动器

echo =====================================================================
echo    高中物理：运动的合成与分解可视化仿真实验室 (离线绿色单机版)
echo =====================================================================
echo.
echo 正在为您准备本地离线运行环境...
echo 提示：本程序支持完全脱机断网使用，适合教室一体机、电子白板或笔记本。
echo.

cd /d "%~dp0"

:: 检查是否存在 index.html
if not exist "%~dp0index.html" (
    echo [错误] 未在当前目录下找到 index.html 文件！
    echo 请确认您已解压全部文件，并将本脚本与 index.html 置于同一文件夹下。
    echo.
    pause
    exit /b
)

:: 尝试使用系统内置 PowerShell 启动无依赖微型本地服务器 (Windows 7/8/10/11 均默认内置)
echo [1/3] 正在启动 Windows 内置本地服务...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$root = '%~dp0'; ^
$port = 8080; ^
while ($true) { ^
    try { ^
        $listener = New-Object System.Net.HttpListener; ^
        $listener.Prefixes.Add(\"http://localhost:$port/\"); ^
        $listener.Start(); ^
        break; ^
    } catch { ^
        $port++; ^
        if ($port -gt 8100) { exit 1 } ^
    } ^
} ^
Write-Host \"[成功] 本地服务已启动: http://localhost:$port/\"; ^
Write-Host \"正在自动打开浏览器演示界面...\"; ^
Write-Host \"---------------------------------------------------------------------\"; ^
Write-Host \"【课堂使用提示】教学演示期间请保持此黑底窗口打开，关闭此窗口即停止服务。\"; ^
Write-Host \"---------------------------------------------------------------------\"; ^
Start-Process \"http://localhost:$port/\"; ^
while ($listener.IsListening) { ^
    try { ^
        $context = $listener.GetContext(); ^
        $request = $context.Request; ^
        $response = $context.Response; ^
        $urlPath = $request.Url.LocalPath.TrimStart('/'); ^
        if ([string]::IsNullOrEmpty($urlPath) -or $urlPath -eq '/') { $urlPath = 'index.html' } ^
        $fullPath = Join-Path $root $urlPath; ^
        if (-not (Test-Path $fullPath -PathType Leaf)) { $fullPath = Join-Path $root 'index.html' } ^
        $bytes = [System.IO.File]::ReadAllBytes($fullPath); ^
        $ext = [System.IO.Path]::GetExtension($fullPath).ToLower(); ^
        switch ($ext) { ^
            '.html' { $response.ContentType = 'text/html; charset=utf-8' } ^
            '.js'   { $response.ContentType = 'application/javascript; charset=utf-8' } ^
            '.css'  { $response.ContentType = 'text/css; charset=utf-8' } ^
            '.json' { $response.ContentType = 'application/json; charset=utf-8' } ^
            '.png'  { $response.ContentType = 'image/png' } ^
            '.svg'  { $response.ContentType = 'image/svg+xml' } ^
            '.ico'  { $response.ContentType = 'image/x-icon' } ^
            default { $response.ContentType = 'application/octet-stream' } ^
        } ^
        $response.ContentLength64 = $bytes.Length; ^
        $response.OutputStream.Write($bytes, 0, $bytes.Length); ^
        $response.OutputStream.Close(); ^
    } catch { } ^
}"

if %errorlevel% neq 0 (
    echo.
    echo [提示] PowerShell 本地监听受限，正在尝试备用启动方式...
    
    :: 尝试 Python
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        echo [2/3] 检测到系统安装了 Python，正在通过 Python 启动本地服务器...
        start http://localhost:8080
        python -m http.server 8080 --bind 127.0.0.1
        goto end
    )
    
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        echo [2/3] 检测到系统安装了 Python Launcher，正在启动本地服务器...
        start http://localhost:8080
        py -m http.server 8080 --bind 127.0.0.1
        goto end
    )

    :: 尝试使用 Edge 跨域调试模式直接打开
    echo [3/3] 正在尝试通过系统内置 Edge 浏览器直接加载演示文件...
    start msedge.exe --allow-file-access-from-files "%~dp0index.html" 2>nul
    if %errorlevel% neq 0 (
        if exist "%~dp0单文件无需服务器_双击即开.html" (
            echo [提示] 正在使用免服务器单文件版直接启动...
            start "" "%~dp0单文件无需服务器_双击即开.html"
        ) else (
            start "" "%~dp0index.html"
        )
    )
)

:end
echo.
pause
