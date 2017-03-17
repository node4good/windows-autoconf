:: Copyright 2017 - Refael Ackermann
:: Distributed under MIT style license
:: See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
:: version: 1.11.0

@ECHO OFF
SETLOCAL
SET PROMPT=$G
SET COM_TEST="if (-NOT (Test-Path 'Registry::HKEY_CLASSES_ROOT\CLSID\{177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D}'))"
powershell -ExecutionPolicy Unrestricted -Command "%COM_TEST% { Exit 1 }"
