@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
cd /d "%~dp0"

title 同频 Same Wavelength - 启动中

echo.
echo  ============================================================
echo    同频 Same Wavelength  —  AI 心理陪伴系统
echo    多智能体（Multi-Agent）联邦架构
echo  ============================================================
echo.

REM ==================== 1. 检查 Node.js ====================
where node >nul 2>&1
if errorlevel 1 goto NO_NODE

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODEVER=%%v
echo  [1/4] Node.js 检测通过：!NODEVER!

REM 主版本号需 ^>= 18
set NODEMAJOR=!NODEVER:v=!
for /f "tokens=1 delims=." %%a in ("!NODEMAJOR!") do set NODEMAJOR=%%a
if !NODEMAJOR! LSS 18 goto OLD_NODE

REM ==================== 2. 定位项目目录 ====================
if not exist "src\package.json" goto NO_PKG
echo  [2/4] 项目目录：src\

REM ==================== 3. 安装依赖 ====================
cd src
if not exist "node_modules" goto DO_INSTALL
if not exist "node_modules\vite" goto DO_INSTALL
if not exist "node_modules\express" goto DO_INSTALL
echo  [3/4] 依赖已就绪，跳过安装
goto RUN

:DO_INSTALL
echo  [3/4] 首次运行，正在安装依赖（约 1-3 分钟，请耐心等待）...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto INSTALL_FAIL
echo.
echo  依赖安装完成

REM ==================== 4. 启动 ====================
:RUN
echo  [4/4] 正在启动服务...
echo.
echo  ------------------------------------------------------------
echo    后端引擎 API ：http://localhost:3001
echo    前端界面     ：http://localhost:5173
echo  ------------------------------------------------------------
echo.
echo  浏览器将自动打开。若未弹出，请手动访问上面的前端地址。
echo.
echo  ※ 关闭本窗口即可停止全部服务。
echo.

REM 交给 npm run dev：它会同时拉起后端引擎与前端界面
call npm run dev

echo.
echo  服务已停止。
pause
exit /b 0

REM ==================== 错误处理 ====================
:NO_NODE
echo.
echo  ============================================================
echo   [错误] 未检测到 Node.js
echo  ============================================================
echo.
echo   本项目需要 Node.js 18 或更高版本才能运行。
echo.
echo   请先安装（任选其一）：
echo     1. 官网下载： https://nodejs.org/    推荐下载 LTS 版本
echo     2. 国内镜像： https://npmmirror.com/mirrors/node/
echo.
echo   安装后请关闭本窗口，再重新双击运行本脚本。
echo   安装时保持默认选项即可（会自动加入 PATH）。
echo.
pause
exit /b 1

:OLD_NODE
echo.
echo  ============================================================
echo   [错误] Node.js 版本过低：!NODEVER!
echo  ============================================================
echo.
echo   本项目需要 Node.js 18 或更高版本。
echo   请升级后重试：https://nodejs.org/
echo.
pause
exit /b 1

:NO_PKG
echo.
echo  ============================================================
echo   [错误] 未找到项目文件
echo  ============================================================
echo.
echo   本脚本需要与 src 文件夹放在同一目录下，结构应为：
echo.
echo     代码\
echo       ├─ 启动.bat      （本脚本）
echo       └─ src\          （项目源码）
echo           └─ package.json
echo.
echo   当前目录：%CD%
echo.
pause
exit /b 1

:INSTALL_FAIL
echo.
echo  ============================================================
echo   [错误] 依赖安装失败
echo  ============================================================
echo.
echo   可能原因与解决办法：
echo     1. 网络问题 —— 换用国内镜像后重试：
echo           npm config set registry https://registry.npmmirror.com
echo        然后重新运行本脚本。
echo     2. 权限问题 —— 右键本脚本，选择"以管理员身份运行"。
echo     3. 磁盘空间不足 —— 请确认至少有 500MB 可用空间。
echo.
cd ..
pause
exit /b 1
