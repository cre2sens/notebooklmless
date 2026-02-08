@echo off
title NotebookLM 폰트 수정기 실행
setlocal

echo ==========================================
echo    NotebookLM 폰트 수정기 실행 중...
echo ==========================================
echo.

:: Node.js 설치 여부 확인
where node >nul 2>1
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org/ 에서 Node.js를 먼저 설치해 주세요.
    pause
    exit /b
)

:: http-server 실행
echo 브라우저에서 자동으로 열립니다 (포트 8080)...
npx -y http-server -p 8080 -o

if %errorlevel% neq 0 (
    echo [오류] 실행 중 문제가 발생했습니다.
    pause
)

endlocal
