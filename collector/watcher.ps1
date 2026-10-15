# Émet une ligne "change" à chaque branchement / débranchement / changement d'alimentation.
$ErrorActionPreference = 'SilentlyContinue'
Register-CimIndicationEvent -ClassName Win32_DeviceChangeEvent -SourceIdentifier 'dev' | Out-Null
Register-CimIndicationEvent -ClassName Win32_PowerManagementEvent -SourceIdentifier 'power' | Out-Null
[Console]::Out.WriteLine('ready'); [Console]::Out.Flush()
while ($true) {
    $e = Wait-Event -Timeout 3600
    if ($e) {
        Remove-Event -EventIdentifier $e.EventIdentifier
        [Console]::Out.WriteLine("change $($e.SourceIdentifier)"); [Console]::Out.Flush()
    }
}
