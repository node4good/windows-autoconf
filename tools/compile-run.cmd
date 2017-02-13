@echo off
for /f %%I in ('cmd /c dir /b /s %windir%\Microsoft.NET\Framework\csc.exe') DO SET CSC=%%I
%CSC% /out:%~dp0Get-VS7.exe %~dp0Get-VS7.cs > nul
%~dp0Get-VS7.exe