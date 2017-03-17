:: Copyright 2017 - Refael Ackermann
:: Distributed under MIT style license
:: See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
:: version: 1.11.0

@IF NOT DEFINED DEBUG_GETTER @ECHO OFF
SETLOCAL
PUSHD %~dp0
SET PROMPT=$G
SET DEBUG_GETTER=
SET COM_TEST="if (-NOT (Test-Path 'Registry::HKEY_CLASSES_ROOT\CLSID\{177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D}'))"
powershell -ExecutionPolicy Unrestricted -Command "%COM_TEST% { Exit 1 }"
IF NOT ERRORLEVEL 1 CALL :find_CL %~dp0 %1 %2
POPD
GOTO :eof

:find_CL
FOR /F "tokens=*" %%A IN ('powershell -NoProfile -ExecutionPolicy Unrestricted "%1GetKey.ps1" "%2" "%3"') DO ECHO %%A& EXIT /B
GOTO :eof
