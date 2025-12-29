@echo off
echo Dang dung tat ca Chrome for Testing processes...
taskkill /F /IM "chrome.exe" /FI "WINDOWTITLE eq Chrome for Testing" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Da kill thanh cong cac Chrome processes.
) else (
    echo Khong tim thay Chrome for Testing processes dang chay.
)
pause
