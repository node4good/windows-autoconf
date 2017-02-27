# windows-autoconf
Try to find MS build tools, and provide installing path and other info needed for compiling 

[![NPM](https://nodei.co/npm/get-vs2017-path.png)](https://nodei.co/npm/get-vs2017-path/)
[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
[![AppVeyor](https://ci.appveyor.com/api/projects/status/u7812xmwxij7ljlh?svg=true)](https://ci.appveyor.com/project/refack/windows-autoconf)

---
As of VS7 (a.k.a. Visual Studio 2017) [Microsoft recommends](https://blogs.msdn.microsoft.com/heaths/2016/09/15/changes-to-visual-studio-15-setup/) to query the VS setup state via COM, but not everybody is fluent in COM, and not every language has COM bindings, so I created some scripts that utilize Windows builtin tools to query this information. The resolved information is printed to stdout in JSON, e.g.
```
[18:45:29.29] D:\code\0tni\windows-autoconf>Tools\try_powershell.cmd
    [
    {
    "Product": "BuildTools",
    "Version": "15.0.26206.0",
    "InstallationPath": "D:\\bin\\dev\\VS\\2017\\BuildTools",
    "IsComplete": "true",
    "IsLaunchable": "false",
    "CmdPath": "D:\\bin\\dev\\VS\\2017\\BuildTools\\Common7\\Tools\\VsDevCmd.bat",
    "MSBuild": {"id": "Microsoft.Component.MSBuild", "version":"15.0.26004.1"},
    "VCTools": {"id": "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "version":"15.0.26109.1"},
    "SDK8": false,
    "SDK10": "10.0.14393.79501",
    "SDK": "10.0.14393.0",
    "Packages": [
...
```

There are 3 scripts
 1. `try_powershell.cmd` will try to JIT compile some C# code that calls COM, and prints the interesting stuff to stdio
 2. `compile-run.cmd` will try to find a C# compiler to compile the query then run the generated exe
 3. `try_registry.cmd` will look for undocumented registry traces 

As the tools was getting traction, I added more use cases such as resolving version and location of Windows SDKs, enumerating "Include" directories, and outputting configuration files for verius build systems
