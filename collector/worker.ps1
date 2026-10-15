# Processus PowerShell persistant : chaque ligne "collect" sur stdin produit un instantané JSON
# suivi d'une ligne de fin. Garder le processus chaud évite ~2 s d'initialisation CIM par collecte.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$script = Join-Path $PSScriptRoot 'collect.ps1'
while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line -or $line -eq 'exit') { break }
    if ($line -eq 'collect') {
        try { $json = (& $script) -join '' } catch { $json = '{"error":' + (ConvertTo-Json "$_") + '}' }
        [Console]::Out.WriteLine($json)
        [Console]::Out.WriteLine('<<<END>>>')
        [Console]::Out.Flush()
    }
}
