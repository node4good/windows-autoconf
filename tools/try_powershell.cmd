@IF NOT DEFINED DEBUG_GETTER @echo off
SET CSFILE=%~dp0Get-VS7.cs
SET COM_TEST="if (-NOT (Test-Path 'Registry::HKEY_CLASSES_ROOT\CLSID\{177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D}'))"
SET JIT_AND_RUN="Add-Type -Path '%CSFILE%'; [VisualStudioConfiguration.Main]::Query()"
powershell -ExecutionPolicy Unrestricted -Command "%COM_TEST% { Write '[\"No COM\"]'} else {%JIT_AND_RUN%}"
