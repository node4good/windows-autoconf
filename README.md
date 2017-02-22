# get-vs2017-path
Try to find Visual Studio installation path via COM or registry

[![NPM](https://nodei.co/npm/get-vs2017-path.png)](https://nodei.co/npm/get-vs2017-path/)
[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
[![AppVeyor](https://ci.appveyor.com/api/projects/status/chx2jj1qx3ubblnp/branch/master?svg=true)](https://ci.appveyor.com/project/refack/get-vs2017-path/branch/master)

---
As of VS7 (a.k.a. Visual Studio 2017) [Microsoft recommends](https://blogs.msdn.microsoft.com/heaths/2016/09/15/changes-to-visual-studio-15-setup/) to query the VS setup state via COM, but not everybody is fluent in COM, and not every language has COM bindings, so I created some scripts that utilize Windows builtin tools to query this information. The resolved information is printed to stdout in JSON, e.g.
```
[16:32:02.47] C:\code\0tni\get-vs2017-path>tools\try_powershell.cmd
[{
"Product": "Enterprise",
"InstallationPath": "C:\\VS\\2017\\Enterprise",
"Version": "15.0.26206.0",
"SDK": "10.0.14393.795",
"CmdPath": "C:\\VS\\2017\\Enterprise\\Common7\\Tools\\VsDevCmd.bat"
},{
"Product": "BuildTools",
"InstallationPath": "C:\\VS\\2017\\BuildTools",
"Version": "15.0.26206.0",
"SDK": "10.0.14393.795",
"CmdPath": "C:\\VS\\2017\\BuildTools\\Common7\\Tools\\VsDevCmd.bat"
}]
[16:32:04.43] C:\code\0tni\get-vs2017-path>
```

There are 3 scripts
 1. `try_powershell.cmd` will try to JIT compile some C# code that calls COM, and prints the interesting stuff to stdio
 2. `compile-run.cmd` will try to find a C# compiler to compile the query then run the generated exe
 3. `try_registry.cmd` will look for undocumented registry traces 

The Javascript interface will find older versions as well
