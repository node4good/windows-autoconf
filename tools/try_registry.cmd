@IF NOT DEFINED DEBUG_GETTER @echo off
ECHO [
FOR /F "delims=XXX skip=2" %%I IN ('reg query HKLM\Software\Microsoft\VisualStudio\SxS\VS7 /reg:32') DO CALL :print "%%I"
ECHO ]
GOTO :eof

:print
ECHO {
FOR /F "tokens=1,3" %%J in (%1) DO CALL :print_line "%%J" "%%K"
ECHO }
EXIT /B

:print_line
ECHO "RegistryVersion": %1,
SET bt_path=%~2
SET RET="InstallationPath":"%bt_path%", "CmdPath":"%bt_path%Common7\Tools\VsDevCmd.bat"
ECHO %RET:\=\\%
EXIT /B
