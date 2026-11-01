@echo off
rem Chili UI docs - one-click build (always builds BOTH the Chinese and the English page)
rem Asks for the interface language on startup (en / cn), then runs _docbuild\batmenu.cjs
rem (UTF-8 safe: the .bat stays pure ASCII, all bilingual text lives in batmenu.cjs).
chcp 65001 >nul
title Chili UI docs
cd /d "%~dp0"
rem A short ASCII banner so the console is never blank while node starts
echo -------------------------------------------------------
echo   Chili UI docs tool    (%~n0)
echo   folder: %~dp0
echo -------------------------------------------------------
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH. Install the LTS version from https://nodejs.org/
  pause
  exit /b 2
)
node "_docbuild\batmenu.cjs" build --ask-lang
exit /b %ERRORLEVEL%
