@echo off
rem Double-click to start the demo app. Close this window to stop it.
python "%~dp0start.py" %*
if errorlevel 1 pause
