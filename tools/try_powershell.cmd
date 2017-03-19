:: Copyright 2017 - Refael Ackermann
:: Distributed under MIT style license
:: See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
:: version: 1.11.0

:: proper output starts with '    ' so we can filter debug output, but stay JSON transparent
@IF NOT DEFINED DEBUG_GETTER @ECHO OFF
SETLOCAL
SET PROMPT=$G
PUSHD %~dp0
CALL check_VS2017_COM.cmd > nul
IF ERRORLEVEL 1 (ECHO     ["No COM"] & EXIT /B 0)
SET "JIT_AND_RUN=Add-Type (Out-String -InputObject (Get-Content '..\tools*\*.cs')); [VisualStudioConfiguration.Program]::Query()"
powershell -NoProfile -ExecutionPolicy Unrestricted -Command "& { %JIT_AND_RUN% }"
POPD
ENDLOCAL
