@IF NOT DEFINED DEBUG_GETTER @echo off
SET FLIP=0
ECHO [
FOR /F "delims=XXX skip=2" %%I IN ('reg query HKLM\Software\Microsoft\VisualStudio\SxS\VS7 /reg:32') DO CALL :print "%%I"
ECHO ]
GOTO :eof

:print
IF %FLIP%==1 ECHO ,{
IF %FLIP%==0 (
    SET FLIP=1
    ECHO {
)
SET PARAM1=%~1
SET DELIMED=%PARAM1:    =;%
FOR /F "tokens=1,3 delims=;" %%J in ("%DELIMED%") DO CALL :print_line "%%J" "%%K"
ECHO }
EXIT /B

:print_line
ECHO "RegistryVersion": %1,
SET RET1="InstallationPath":"%~2",
SET RET2="CmdPath":"%~2Common7\Tools\VsDevCmd.bat"
ECHO %RET1:\=\\%
ECHO %RET2:\=\\%
EXIT /B
