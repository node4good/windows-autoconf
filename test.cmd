for /F %%i in ('node -e "var t = require(\"./\"); console.log(t.try_powershell_path); console.log(t.compile_run_path); console.log(t.try_registry_path);" ') DO %%i
