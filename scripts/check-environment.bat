@echo off
REM Environment check script for Forge Empire deployment

echo Checking deployment environment for Forge Empire...

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('docker --version') do set docker_version=%%i
    echo ✅ Docker: %docker_version%
) else (
    echo ❌ Docker: Not found
    echo    Please install Docker Desktop: https://www.docker.com/products/docker-desktop
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('docker-compose --version') do set compose_version=%%i
    echo ✅ Docker Compose: %compose_version%
) else (
    echo ❌ Docker Compose: Not found
    echo    Docker Compose is included with Docker Desktop
)

REM Check Kubernetes
kubectl version --client >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('kubectl version --client') do set kubectl_version=%%i
    echo ✅ Kubernetes CLI ^(kubectl^): %kubectl_version%
) else (
    echo ⚠️  Kubernetes CLI ^(kubectl^): Not found
    echo    For Kubernetes deployment, install kubectl
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('node --version') do set node_version=%%i
    echo ✅ Node.js: %node_version%
) else (
    echo ❌ Node.js: Not found
    echo    Please install Node.js: https://nodejs.org/
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%i in ('npm --version') do set npm_version=%%i
    echo ✅ npm: %npm_version%
) else (
    echo ❌ npm: Not found
    echo    npm is included with Node.js
)

echo.
echo Environment check complete!