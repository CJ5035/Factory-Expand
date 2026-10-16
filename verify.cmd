@echo off
node "%~dp0scripts\verify.mjs" %*
exit /b %errorlevel%
