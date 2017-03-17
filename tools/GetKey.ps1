# Copyright 2017 - Refael Ackermann
# Distributed under MIT style license
# See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
# version: 1.10.0

param (
    [Parameter(Mandatory=$false)]
    [string]$filter = "",
    [Parameter(Mandatory=$false)]
    [string]$key = ""
)
Add-Type -Path GetVS2017Configuration.cs;
$inst = ([VisualStudioConfiguration.Main]::QueryEx($filter))[0]
$arg = $args[0]
if ($key -eq "All") { echo $inst; Exit 0 }
if ($key -ne "") { echo $inst.Get($key); Exit 0 }
# Default is get `cl.exe` path
if (($env:PROCESSOR_ARCHITEW6432 -ne $null) -or ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64'))
{ $toolsKey = 'VisualCppToolsX64' } else {$toolsKey = 'VisualCppToolsX86'}
$cl = $inst.Get($toolsKey) + 'cl.exe'
if (($cl -ne $null) -and (Test-Path $cl)) {echo $cl} else {Exit 0}
