@IF NOT DEFINED DEBUG_GETTER @echo off
powershell -ExecutionPolicy Unrestricted -Command "&{ New-PSDrive -Name HKCR -PSProvider Registry -Root HKEY_CLASSES_ROOT; Test-Path -Path 'HKCR:\CLSID\{177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D}'}"
IF ERRORLEVEL 1 echo []
SET CSFILE=%~dp0Get-VS7.cs
powershell -ExecutionPolicy Unrestricted -Command "&{ Add-Type -Path '%CSFILE%'; [VisualStudioConfiguration.Main]::Query()}"
