:: Copyright 2017 - Refael Ackermann
:: Distributed under MIT style license
:: See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
:: version: 1.10.0

:: proper output starts with '    ' so we can filter debug output, but stay JSON transparent
@IF NOT DEFINED DEBUG_GETTER @ECHO OFF
SETLOCAL
SET PROMPT=$G
SET FLIP=0
SET BASE_KEY=HKEY_LOCAL_MACHINE\Software\Microsoft\MSBuild\ToolsVersions
ECHO     [
FOR /F "delims=: skip=1" %%V IN ('reg query "%BASE_KEY%" /s /k /f * /reg:32') DO CALL :query_ver "%%V"
ECHO     ]
GOTO :eof

:query_ver
IF %1=="End of search" EXIT /B
FOR /F "delims=XXX skip=1" %%I IN ('reg query %1 /v /e /f MSBuildToolsPath /reg:32') DO IF "%%I"=="End of search: 0 match(es) found." EXIT /B
IF %FLIP%==1 ECHO     ,{
IF %FLIP%==0 (
SET FLIP=1
ECHO     {
)
SET PARAM=%~1
SETLOCAL
SET FLIP2=0
SET TRUNCVER=%PARAM:HKEY_LOCAL_MACHINE\Software\Microsoft\MSBuild\ToolsVersions\=%
FOR /F "delims=. tokens=1,2" %%A IN ("%TRUNCVER%") DO ECHO     "ver":%%A.%%B
FOR /F "delims=XXX skip=2" %%I IN ('reg query %1 /v /e /f MSBuildToolsPath /reg:32') DO CALL :print "%%I"
ECHO     }
EXIT /B

:print
SET PARAM1=%~1
SET DELIMED=%PARAM1:    =;%
SET DELIMED=%DELIMED: of search:=;%
FOR /F "tokens=1,3 delims=;" %%J IN ("%DELIMED%") DO CALL :print_line "%%J" "%%K"
EXIT /B

:print_line
IF %1=="End" EXIT /B
SET MSBUILD="%~2MSBuild.exe"
IF NOT EXIST %MSBUILD% EXIT /B
SET RET1=,"%~1":"%~2"
SET RET2=,"MSBuildPath":%MSBUILD%
ECHO     %RET1:\=\\%
ECHO     %RET2:\=\\%
EXIT /B
