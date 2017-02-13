@echo off
FOR /F "delims=XXX" %%I IN ('reg query HKLM\Software\Microsoft\VisualStudio\SxS\VS7 /reg:32') DO SET VAL=%%I
FOR %%I in (%VAL%) DO SET bt_path=%%I
echo %bt_path%