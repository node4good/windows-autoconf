:: proper output starts with '    ' so we can filter debug output, but stay JSON transparent
@IF NOT DEFINED DEBUG_GETTER @ECHO OFF
SETLOCAL
SET FLIP=0
SET BASE_KEY=HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Microsoft SDKs\Windows
ECHO     [
FOR /F "delims=: skip=1" %%V IN ('reg query "%BASE_KEY%" /k /f * /reg:32') DO CALL :query_ver "%%V"
ECHO     ]
GOTO :eof

:query_ver
IF %1=="End of search" EXIT /B
IF %FLIP%==1 ECHO     ,{
IF %FLIP%==0 (
SET FLIP=1
ECHO     {
)
SETLOCAL
SET FLIP2=0
FOR /F "delims=XXX skip=2" %%I IN ('reg query %1 /v /f "*" /reg:32') DO CALL :print "%%I"
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
IF %FLIP2%==1 SET NEEDED_COMA=,
IF %FLIP2%==0 SET FLIP2=1
SET RET1=%NEEDED_COMA%"%~1":"%~2"
ECHO     %RET1:\=\\%
EXIT /B
