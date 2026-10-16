@echo off
node "%~dp0scripts\restore.mjs" %*
exit /b %errorlevel%
