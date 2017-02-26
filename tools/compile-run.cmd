@IF NOT DEFINED DEBUG_GETTER @echo off
SET CS_NAME="%~dp0GetVS2017Configuration.cs"
SET EXE_NAME="%~dp0GetVS2017Configuration.exe"
for /f %%I in ('cmd /c dir /b /s %windir%\Microsoft.NET\Framework\csc.exe') DO SET CSC=%%I
%CSC% /out:%EXE_NAME% %CS_NAME%  > nul
%EXE_NAME%
