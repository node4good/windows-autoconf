:: Copyright 2017 - Refael Ackermann
:: Distributed under MIT style license
:: See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
:: version: 1.10.0

:: proper output starts with '    ' so we can filter debug output, but stay JSON transparent
@IF NOT DEFINED DEBUG_GETTER @ECHO OFF
SETLOCAL
SET PROMPT=$G
CALL "%~dp0check_VS2017_COM.cmd" > nul
IF ERRORLEVEL 1 (ECHO     ["No COM"] & EXIT /B)
SET CS_FILE=%~dp0GetVS2017Configuration.cs
SET COM_TEST="if (-NOT (Test-Path 'Registry::HKEY_CLASSES_ROOT\CLSID\{177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D}'))"
SET JIT_AND_RUN="Add-Type -Path '%CS_FILE%'; [VisualStudioConfiguration.Main]::Query()"
powershell -NoProfile -ExecutionPolicy Unrestricted -Command "%COM_TEST% { Write '[\"No COM\"]'} else { %JIT_AND_RUN% }"
