import os
import glob
import shutil
import zipfile
import re

def pack_offline():
    base_dir = '/app/applet'
    dist_dir = os.path.join(base_dir, 'dist')
    public_dir = os.path.join(base_dir, 'public')
    assets_dir = os.path.join(dist_dir, 'assets')

    # 1. Locate css and js in dist/assets
    css_files = glob.glob(os.path.join(assets_dir, '*.css'))
    js_files = glob.glob(os.path.join(assets_dir, '*.js'))

    if not css_files or not js_files:
        raise RuntimeError("No css or js found in dist/assets! Please run npm run build first.")

    css_file = css_files[0]
    js_file = js_files[0]

    with open(css_file, 'r', encoding='utf-8') as f:
        css_content = f.read()

    with open(js_file, 'r', encoding='utf-8') as f:
        js_content = f.read()

    # Prevent potential inline closing script tag issues
    js_content_safe = js_content.replace('</script>', '<\\/script>')

    # 2. Build bulletproof standalone single-file HTML
    # Critical fix for white screen:
    # Styles go into <head>.
    # <div id="root"></div> must be in <body>.
    # The inlined <script> MUST be placed at the bottom of <body> AFTER <div id="root"></div>,
    # never in <head>!
    single_html_content = f'''<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
    <title>运动的合成与分解演示实验室 - 高中物理可视化仿真</title>
    <meta name="description" content="高中物理运动的合成与分解可视化仿真实验：演示二维平面分运动与合运动、位移/速度/加速度矢量合成与分解及轨迹方程解析。" />
    <meta property="og:title" content="运动的合成与分解演示实验室 - 高中物理可视化仿真" />
    <meta property="og:description" content="高中物理运动的合成与分解可视化仿真实验：演示二维平面分运动与合运动、位移/速度/加速度矢量合成与分解及轨迹方程解析。" />
    <meta name="theme-color" content="#0f172a" />
    <style>
{css_content}
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100 select-none antialiased">
    <div id="root"></div>
    <noscript>
      <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f87171; text-align: center;">
        <h2>无法启动实验室</h2>
        <p>您的浏览器禁用了 JavaScript，请在支持现代浏览器的环境中运行本实验室（推荐 Edge / Chrome / 华为浏览器 / iPad Safari）。</p>
      </div>
    </noscript>
    <script>
{js_content_safe}
    </script>
  </body>
</html>
'''

    single_html_name = '单文件无需服务器_双击即开.html'
    single_html_public = os.path.join(public_dir, single_html_name)
    single_html_dist = os.path.join(dist_dir, single_html_name)

    with open(single_html_public, 'w', encoding='utf-8') as f:
        f.write(single_html_content)
    with open(single_html_dist, 'w', encoding='utf-8') as f:
        f.write(single_html_content)

    print(f"Generated {single_html_name}: {os.path.getsize(single_html_public):,} bytes")

    # 3. Copy helper guides and bat files to dist
    helper_files = [
        '一键在Windows运行.bat',
        '以独立应用窗口直接启动(无地址栏).bat',
        'Windows系统使用说明.txt',
        'Android平板系统使用说明.txt',
        '使用说明.txt'
    ]
    for helper in helper_files:
        src = os.path.join(public_dir, helper)
        dst = os.path.join(dist_dir, helper)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    # 4. Create Windows dedicated archive: 物理运动合成与分解_Windows独立离线包.zip
    win_zip_name = '物理运动合成与分解_Windows独立离线包.zip'
    win_zip_public = os.path.join(public_dir, win_zip_name)
    win_zip_dist = os.path.join(dist_dir, win_zip_name)

    win_files = [
        '以独立应用窗口直接启动(无地址栏).bat',
        '一键在Windows运行.bat',
        single_html_name,
        'Windows系统使用说明.txt',
        'index.html',
        'manifest.webmanifest',
        'sw.js',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png'
    ]

    with zipfile.ZipFile(win_zip_public, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for fname in win_files:
            fpath = os.path.join(dist_dir, fname)
            if os.path.exists(fpath):
                zf.write(fpath, fname)
            else:
                fpath_pub = os.path.join(public_dir, fname)
                if os.path.exists(fpath_pub):
                    zf.write(fpath_pub, fname)
        for root, dirs, files in os.walk(assets_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                zf.write(full_path, rel_path)

    shutil.copy2(win_zip_public, win_zip_dist)
    print(f"Generated {win_zip_name}: {os.path.getsize(win_zip_public):,} bytes")

    # 5. Create Android Tablet dedicated archive: 物理运动合成与分解_Android平板独立离线包.zip
    android_zip_name = '物理运动合成与分解_Android平板独立离线包.zip'
    android_zip_public = os.path.join(public_dir, android_zip_name)
    android_zip_dist = os.path.join(dist_dir, android_zip_name)

    android_files = [
        single_html_name,
        'Android平板系统使用说明.txt',
        'index.html',
        'manifest.webmanifest',
        'sw.js',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png'
    ]

    with zipfile.ZipFile(android_zip_public, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for fname in android_files:
            fpath = os.path.join(dist_dir, fname)
            if os.path.exists(fpath):
                zf.write(fpath, fname)
            else:
                fpath_pub = os.path.join(public_dir, fname)
                if os.path.exists(fpath_pub):
                    zf.write(fpath_pub, fname)
        for root, dirs, files in os.walk(assets_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                zf.write(full_path, rel_path)

    shutil.copy2(android_zip_public, android_zip_dist)
    print(f"Generated {android_zip_name}: {os.path.getsize(android_zip_public):,} bytes")

    # 6. Create Universal USB Portable bundle: 物理运动合成与分解_U盘离线绿色包.zip
    usb_zip_name = '物理运动合成与分解_U盘离线绿色包.zip'
    usb_zip_public = os.path.join(public_dir, usb_zip_name)
    usb_zip_dist = os.path.join(dist_dir, usb_zip_name)

    all_files = [
        '以独立应用窗口直接启动(无地址栏).bat',
        '一键在Windows运行.bat',
        single_html_name,
        'Windows系统使用说明.txt',
        'Android平板系统使用说明.txt',
        '使用说明.txt',
        'index.html',
        'manifest.webmanifest',
        'sw.js',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png'
    ]

    with zipfile.ZipFile(usb_zip_public, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for fname in all_files:
            fpath = os.path.join(dist_dir, fname)
            if os.path.exists(fpath):
                zf.write(fpath, fname)
            else:
                fpath_pub = os.path.join(public_dir, fname)
                if os.path.exists(fpath_pub):
                    zf.write(fpath_pub, fname)
        for root, dirs, files in os.walk(assets_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                zf.write(full_path, rel_path)

    shutil.copy2(usb_zip_public, usb_zip_dist)
    print(f"Generated {usb_zip_name}: {os.path.getsize(usb_zip_public):,} bytes")

    # 7. Create dist.zip
    dist_zip_name = 'dist.zip'
    dist_zip_public = os.path.join(public_dir, dist_zip_name)
    dist_zip_dist = os.path.join(dist_dir, dist_zip_name)

    with zipfile.ZipFile(dist_zip_public, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                if file.endswith('.zip'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                zf.write(full_path, rel_path)

    shutil.copy2(dist_zip_public, dist_zip_dist)
    print(f"Generated {dist_zip_name}: {os.path.getsize(dist_zip_public):,} bytes")

    print("All offline packages generated successfully!")

if __name__ == '__main__':
    pack_offline()
