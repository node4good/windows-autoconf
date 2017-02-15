# get-vs2017-path
Try to find the VS2017 buildtools path via COM or registry

---
As of VS7 (a.k.a. Visual Studio 2017) [Microsoft recommends](https://blogs.msdn.microsoft.com/heaths/2016/09/15/changes-to-visual-studio-15-setup/) to query the VS setup state via COM, but not everybody is fluent in COM, and not every langugae has COM bindings, so I creted some scripts that utilize Windows builtin tools to query this information. All resolved information is printed to stdout in an easy to parsed format e.g.
```
C:\code\0tni\get-vs7-path> Tools\try_powershell.cmd
InstallationPath: D:\bin\dev\VS\2017\BuildTools
Product: Microsoft.VisualStudio.Product.BuildTools
SDK: 10.0.14393.795

0
```

There are 3 scripts
 1. `try_powershell.cmd` will try to JIT compile some C# code that calls COM, and prints the interesting stuff to stdio
 2. `compile-run.cmd` will try to find a C# compiler to compile the query then run the generated exe
 3. `try_registry.cmd` will look for undocumented registry traces 

