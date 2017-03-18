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
if (-NOT (Test-Path 'Registry::HKEY_CLASSES_ROOT\CLSID\{177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D}')) { Exit 1 }
Add-Type -Path GetVS2017Configuration.cs;
$insts = [VisualStudioConfiguration.ComSurrogate]::QueryEx()
if ($filter -ne "*") { $insts = $insts | where { $_.Get($filter) } }
if ($key -eq "*") { $insts | echo } else { $insts | % { $_.Get($key) } }
