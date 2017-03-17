# Copyright 2017 - Refael Ackermann
# Distributed under MIT style license
# See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
# version: 1.11.0

param (
    [Parameter(Mandatory=$false)]
    [string]$filter = "IsVcCompatible",
    [Parameter(Mandatory=$false)]
    [string]$key = "VisualCppToolsCL"
)
Add-Type -Path GetVS2017Configuration.cs;
$inst = ([VisualStudioConfiguration.ComSurrogate]::QueryEx($filter))[0]
$arg = $args[0]
if ($key -eq "All") { echo $inst; Exit 0 }
if ($key -ne "") { echo $inst.Get($key) }
