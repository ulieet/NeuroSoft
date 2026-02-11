@echo off
echo ==========================================
echo      INICIANDO NEUROSOFT SYSTEM
echo ==========================================
echo.
echo [1/2] Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Desktop no esta instalado o no esta corriendo.
    pause
    exit
)

echo [2/2] Construyendo y levantando el sistema...
docker-compose up --build

pause