@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem ==== Settings (edit as needed) ====
set MODEL=models\Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Q8_K_P.gguf
set MMPROJ=models\mmproj-Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-f16.gguf
rem Context length: max 131072. 32768 is comfortable on 16 GB VRAM.
set CTX=32768
set PORT=8080
rem ==================================

if not exist "llama.cpp\llama-server.exe" (
  echo [error] llama.cpp\llama-server.exe not found.
  pause & exit /b 1
)
if not exist "%MODEL%" (
  echo [error] Model file not found: %MODEL%
  pause & exit /b 1
)

set MMPROJ_ARG=
if exist "%MMPROJ%" set MMPROJ_ARG=--mmproj "%MMPROJ%"

echo Starting local model... chat UI: http://127.0.0.1:%PORT%
echo Close this window to stop the model.
start "" cmd /c "timeout /t 8 >nul & start http://127.0.0.1:%PORT%"

rem web\ holds our own chat UI; delete --path web to get llama.cpp's built-in UI back
"llama.cpp\llama-server.exe" -m "%MODEL%" %MMPROJ_ARG% --path web ^
  --jinja -ngl 99 -fa on -c %CTX% ^
  --temp 1.0 --top-p 0.95 --top-k 64 ^
  --host 127.0.0.1 --port %PORT%

pause
