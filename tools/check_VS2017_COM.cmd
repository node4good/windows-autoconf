@ECHO OFF
SET COM_TEST="if (-NOT (Test-Path 'Registry::HKEY_CLASSES_ROOT\CLSID\{177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D}'))"
powershell -ExecutionPolicy Unrestricted -Command "%COM_TEST% { Write '\"No COM\"'; Exit 1 } else {Write '\"COM Ok\"' }"
