:: Copyright 2017 - Refael Ackermann
:: Distributed under MIT style license
:: See accompanying file LICENSE at https://github.com/node4good/windows-autoconf

@IF NOT DEFINED DEBUG_GETTER @ECHO OFF
SETLOCAL
PUSHD %~dp0
SET PROMPT=$G
SET DEBUG_GETTER=
CALL :find_CL %~dp0 %1 %2
POPD
GOTO :eof

:find_CL
FOR /F "tokens=*" %%A IN ('powershell -NoProfile -ExecutionPolicy Unrestricted "%1GetKey.ps1" "%2" "%3"') DO ECHO %%A& EXIT /B
GOTO :eof
