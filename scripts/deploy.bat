@echo off
REM Deployment script for Forge Empire blockchain (Windows)

echo Forge Empire - Production Deployment
echo ====================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Compose is not installed. Please install Docker Desktop which includes Compose.
    exit /b 1
)

REM Build the Docker images
echo Building Docker images...
docker-compose build

REM Start the services
echo Starting services...
docker-compose up -d

REM Wait for services to start
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Check service status
echo Checking service status...
docker-compose ps

echo.
echo Deployment completed successfully!
echo.
echo Services:
echo   - Leader Node API: http://localhost:8080
echo   - Follower Node 1 API: http://localhost:8081
echo   - Follower Node 2 API: http://localhost:8082
echo   - Block Explorer: http://localhost:3000
echo.
echo To view logs:
echo   - Leader: docker-compose logs -f leader
echo   - Follower 1: docker-compose logs -f follower1
echo   - Follower 2: docker-compose logs -f follower2
echo   - Explorer: docker-compose logs -f explorer