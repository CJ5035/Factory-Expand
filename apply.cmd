@echo off
node "%~dp0scripts\apply.mjs" %*
exit /b %errorlevel%
