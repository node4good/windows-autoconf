:: proper output starts with '    ' so we can filter debug output, but stay JSON transparent
@IF NOT DEFINED DEBUG_GETTER @ECHO OFF
CALL "%~dp0check_VS2017_COM.cmd" > nul
IF ERRORLEVEL 1 (ECHO     ["No COM"] & EXIT /B)
SET CS_NAME="%~dp0GetVS2017Configuration.cs"
SET EXE_NAME="%~dp0GetVS2017Configuration.exe"
FOR /f %%I IN ('cmd /c dir /b /s %windir%\Microsoft.NET\Framework\csc.exe') DO SET CSC=%%I
%CSC% /out:%EXE_NAME% %CS_NAME%  > nul
%EXE_NAME%
