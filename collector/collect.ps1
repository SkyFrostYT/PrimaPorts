# PrimaPorts — collecteur des périphériques connectés.
# Sortie : un document JSON sur stdout (UTF-8).
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$devices = New-Object System.Collections.Generic.List[object]

function Add-Device {
    param($Id, $Category, $Name, $Connection, $Status = 'connected', $Vendor = $null, [System.Collections.Specialized.OrderedDictionary]$Details = $null, [string[]]$Tags = @())
    $d = [ordered]@{}
    if ($Details) { foreach ($k in $Details.Keys) { if ($null -ne $Details[$k] -and "$($Details[$k])" -ne '') { $d[$k] = "$($Details[$k])" } } }
    $devices.Add([ordered]@{
        id = "$Id"; category = $Category; name = "$Name".Trim(); connection = $Connection
        status = $Status; vendor = $Vendor; details = $d; tags = $Tags
        port = $null; portType = $null; speed = $null; watts = $null; battery = $null
    })
}

function Get-DevProps($PnpEntity, [string[]]$Keys) {
    $r = @{}
    $res = Invoke-CimMethod -InputObject $PnpEntity -MethodName GetDeviceProperties -Arguments @{ devicePropertyKeys = $Keys }
    foreach ($p in $res.deviceProperties) { if ($p.KeyName) { $r[$p.KeyName] = $p.Data } }
    $r
}

function Format-Size([double]$bytes) {
    if ($bytes -le 0) { return $null }
    $u = 'o', 'Ko', 'Mo', 'Go', 'To'; $i = 0
    while ($bytes -ge 1000 -and $i -lt 4) { $bytes /= 1000; $i++ }
    '{0:N1} {1}' -f $bytes, $u[$i]
}

$KEY_BUSDESC   = 'DEVPKEY_Device_BusReportedDeviceDesc'
$KEY_LOCAL     = 'DEVPKEY_Device_InLocalMachineContainer'
$KEY_MFR       = 'DEVPKEY_Device_Manufacturer'
$KEY_BTCONN    = '{83DA6326-97A6-4088-9453-A1923F573B29} 15'
$KEY_BTCOD     = '{2BD67D8B-8BEB-48D5-87E0-6CDA3428040A} 10'
$KEY_BTBATT    = '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'

$VENDORS = @{
    '046D' = 'Logitech'; '1532' = 'Razer'; '045E' = 'Microsoft'; '1038' = 'SteelSeries'; '0951' = 'Kingston'
    '0781' = 'SanDisk'; '090C' = 'Silicon Motion'; '05AC' = 'Apple'; '04E8' = 'Samsung'; '2717' = 'Xiaomi'
    '18D1' = 'Google'; '13D3' = 'IMC Networks'; '0BDA' = 'Realtek'; '8087' = 'Intel'; '1B1C' = 'Corsair'
    '3434' = 'Keychron'; '258A' = 'Sinowealth'; '0B05' = 'ASUS'; '17EF' = 'Lenovo'; '413C' = 'Dell'
    '03F0' = 'HP'; '04A9' = 'Canon'; '04B8' = 'Epson'; '054C' = 'Sony'; '057E' = 'Nintendo'; '0D8C' = 'C-Media'
    '1915' = 'Nordic'; '0E8D' = 'MediaTek'; '322E' = 'Sonix'; '2109' = 'VIA Labs'; '05E3' = 'Genesys Logic'
    '152D' = 'JMicron'; '174C' = 'ASMedia'; '1058' = 'Western Digital'; '0BC2' = 'Seagate'; '14CD' = 'Super Top'
    '1E7D' = 'ROCCAT'; '0C45' = 'Microdia'; '046A' = 'Cherry'; '1D50' = 'OpenMoko'; '20A0' = 'Clay Logic'
    '1050' = 'Yubico'; '0A12' = 'CSR'; '2357' = 'TP-Link'; '0846' = 'Netgear'; '2001' = 'D-Link'
}

$all = @(Get-CimInstance Win32_PnPEntity)
$byId = @{}; foreach ($e in $all) { if ($e.PNPDeviceID) { $byId[$e.PNPDeviceID.ToUpper()] = $e } }

# ---------------------------------------------------------------- Topologie USB : prises physiques
if (-not ('PrimaPorts.UsbTopology' -as [type])) { Add-Type -Path (Join-Path $PSScriptRoot 'UsbTopology.cs') }
$lanes = @([PrimaPorts.UsbTopology]::Read())
$laneIndex = @{}; foreach ($l in $lanes) { $laneIndex["$($l.HubInstanceId.ToUpper())|$($l.Port)"] = $l }

# Une prise physique = une voie USB 2 + ses voies USB 3 « compagnes » (deux pour l'USB-C réversible).
$connectors = New-Object System.Collections.Generic.List[object]
$laneToConnector = @{}
foreach ($hub in $lanes | Where-Object { $_.HubIsRoot -and $_.UserConnectable } | Group-Object HubInstanceId) {
    $groups = [ordered]@{}
    foreach ($l in $hub.Group | Where-Object { -not $_.PortSupportsUsb3 } | Sort-Object Port) { $groups["$($l.Port)"] = @($l) }
    foreach ($l in $hub.Group | Where-Object { $_.PortSupportsUsb3 } | Sort-Object Port) {
        $k = "$($l.CompanionPort)"
        if ($l.CompanionPort -and $groups.Contains($k)) { $groups[$k] += $l } else { $groups["ss$($l.Port)"] = @($l) }
    }
    foreach ($g in $groups.Values) {
        $typeC = @($g | Where-Object TypeC).Count -gt 0
        $usb3 = @($g | Where-Object PortSupportsUsb3).Count -gt 0
        $c = [ordered]@{
            id = "$($hub.Name)|$(($g | ForEach-Object Port) -join '+')"
            type = if ($typeC) { 'usb-c' } else { 'usb-a' }
            label = if ($typeC) { 'USB‑C' } elseif ($usb3) { 'USB‑A 3' } else { 'USB‑A 2.0' }
            standard = if ($usb3) { 'USB 3 · jusqu''à 5 Gbit/s' } else { 'USB 2.0 · jusqu''à 480 Mbit/s' }
            deviceId = $null; deviceName = $null; category = $null
        }
        $connectors.Add($c)
        foreach ($l in $g) { $laneToConnector["$($l.HubInstanceId.ToUpper())|$($l.Port)"] = $c }
    }
}
# Numérotation lisible quand plusieurs prises portent le même nom
foreach ($grp in $connectors | Group-Object { $_.label }) {
    if ($grp.Count -gt 1) { $i = 1; foreach ($c in $grp.Group) { $c.label = "$($c.label) n°$i"; $i++ } }
}

$SPEEDS = @{ 0 = 'USB 1.1 · 1,5 Mbit/s'; 1 = 'USB 1.1 · 12 Mbit/s'; 2 = 'USB 2.0 · 480 Mbit/s'; 3 = 'USB 3 · 5 Gbit/s' }

# Remonte de l'appareil jusqu'à la prise du PC, en traversant d'éventuels hubs externes.
function Find-UsbAttachment([string]$InstanceId) {
    $cur = $InstanceId.ToUpper(); $own = $null; $hubs = @()
    for ($i = 0; $i -lt 8; $i++) {
        $e = $byId[$cur]; if (-not $e) { return $null }
        $pp = Get-DevProps $e @('DEVPKEY_Device_Parent', 'DEVPKEY_Device_Address')
        $parent = "$($pp['DEVPKEY_Device_Parent'])".ToUpper()
        if (-not $parent) { return $null }
        $lane = $laneIndex["$parent|$($pp['DEVPKEY_Device_Address'])"]
        if ($lane) {
            if (-not $own) { $own = $lane }
            if ($lane.HubIsRoot) {
                return @{ lane = $own; root = $lane; connector = $laneToConnector["$parent|$($lane.Port)"]; hubs = $hubs }
            }
            $hubs += $byId[$parent].Name
        }
        $cur = $parent
    }
    $null
}

# Ajoute à un appareil USB sa prise, sa vitesse et sa puissance déclarée.
function Set-UsbInfo($Device, $Att) {
    if (-not $Att) { return }
    $l = $Att.lane; $c = $Att.connector
    if ($c) {
        $Device.port = $c.label; $Device.portType = $c.type
        if (-not $c.deviceId) { $c.deviceId = $Device.id; $c.deviceName = $Device.name; $c.category = $Device.category }
        $Device.details['Prise'] = "$($c.label) ($($c.standard))"
    }
    if ($Att.hubs.Count) { $Device.details['Via'] = ($Att.hubs | Where-Object { $_ }) -join ' → ' }
    if ($l.Connected) {
        $sp = if ($l.Speed -ge 3 -and $l.SuperSpeedPlus) { 'USB 3 · 10 Gbit/s' } else { $SPEEDS[[int]$l.Speed] }
        $Device.speed = $sp; $Device.details['Vitesse négociée'] = $sp
        if ($l.MaxPowerMa -ge 0) {
            if ($l.SelfPowered -and $l.MaxPowerMa -eq 0) { $Device.details['Alimentation'] = 'Propre (secteur ou batterie)' }
            else {
                $w = [math]::Round($l.MaxPowerMa * 5 / 1000, 2)
                $Device.watts = $w
                $Device.details['Puissance demandée'] = '{0:N1} W max ({1} mA sous 5 V)' -f $w, $l.MaxPowerMa
            }
        }
    }
}

# ---------------------------------------------------------------- USB physiques
$generic = '^(Périphérique USB composite|USB Composite Device|Périphérique d.entrée USB|USB Input Device|Périphérique HID|HID-compliant|Périphérique conforme aux|Périphérique clavier PIH|HID Keyboard Device|Souris HID|HID-compliant mouse|Périphérique USB|Generic USB)'
$roots = $all | Where-Object { $_.PNPDeviceID -match '^USB\\VID_([0-9A-F]{4})&PID_([0-9A-F]{4})\\' -and $_.PNPDeviceID -notmatch '&MI_' -and $_.PNPDeviceID -notmatch 'ROOT_HUB' -and $_.Name -notmatch 'Hub|concentrateur' }
$usbHandled = @{}

foreach ($r in $roots) {
    $null = $r.PNPDeviceID -match 'VID_([0-9A-F]{4})&PID_([0-9A-F]{4})'
    $vid = $Matches[1]; $pidv = $Matches[2]; $vp = "VID_$vid&PID_$pidv"
    if ($r.Service -match 'USBSTOR|UASPStor') { continue }   # couvert par les disques
    $kids = @($all | Where-Object { $_.PNPDeviceID -like "*$vp*" -and $_.PNPDeviceID -ne $r.PNPDeviceID } | Sort-Object PNPDeviceID)
    $classes = @($kids | ForEach-Object { $_.PNPClass }) + $r.PNPClass
    if ($classes -contains 'Net' -and $classes -notcontains 'Bluetooth') { continue }   # couvert par la section Réseau

    $props = Get-DevProps $r @($KEY_BUSDESC, $KEY_LOCAL, $KEY_MFR)
    $att = Find-UsbAttachment $r.PNPDeviceID
    # Intégré : déclaré comme tel par Windows, ou branché sur une voie interne (non accessible à l'utilisateur)
    $internal = $props[$KEY_LOCAL] -eq $true -or ($att -and -not $att.root.UserConnectable)

    $cat = 'usb'
    if ($classes -contains 'WPD') { $cat = 'phone' }
    elseif ($classes -contains 'Camera' -or $classes -contains 'Image') { $cat = 'camera' }
    elseif ($classes -contains 'Mouse' -or $classes -contains 'Keyboard') {
        $first = $kids | Where-Object { $_.PNPClass -in 'Mouse', 'Keyboard' } | Select-Object -First 1
        $cat = if ($first.PNPClass -eq 'Mouse') { 'mouse' } else { 'keyboard' }
    }
    elseif ($classes -contains 'MEDIA' -or $classes -contains 'AudioEndpoint') { $cat = 'audio' }
    elseif ($classes -contains 'Bluetooth') { $cat = 'network' }
    elseif ($classes -contains 'Net') { $cat = 'network' }
    elseif ($classes -contains 'Printer') { $cat = 'printer' }
    elseif ($classes -contains 'HIDClass' -and $classes -notcontains 'Mouse') { $cat = 'usb' }

    $name = if ($r.PNPClass -eq 'USB' -or -not $r.Name) { $props[$KEY_BUSDESC] } else { $r.Name }
    if (-not $name -or $name -match $generic) {
        $better = $kids + $r | Where-Object { $_.Name -and $_.Name -notmatch $generic } | Select-Object -First 1
        $name = if ($better) { $better.Name } elseif ($props[$KEY_BUSDESC]) { $props[$KEY_BUSDESC] } else { $r.Name }
    }
    $vendor = $VENDORS[$vid]; if (-not $vendor -and $props[$KEY_MFR] -notmatch '^\(|Standard|Microsoft') { $vendor = $props[$KEY_MFR] }

    $det = [ordered]@{
        'Identifiant'  = "VID $vid · PID $pidv"
        'Fonctions'    = (@($kids | Where-Object { $_.PNPClass -and $_.PNPClass -ne 'USB' -and $_.PNPClass -ne 'HIDClass' } | ForEach-Object { $_.Name } | Select-Object -Unique) -join ', ')
        'Pilote'       = $r.Service
        'État'         = if ($r.ConfigManagerErrorCode -eq 0) { 'Fonctionne correctement' } else { "Erreur $($r.ConfigManagerErrorCode)" }
    }
    $tags = @(); if ($internal) { $tags += 'internal' }
    Add-Device -Id $r.PNPDeviceID -Category $cat -Name $name -Connection ($(if ($internal) { 'Intégré (USB)' } else { 'USB' })) `
        -Status ($(if ($r.ConfigManagerErrorCode -eq 0) { 'connected' } else { 'error' })) -Vendor $vendor -Details $det -Tags $tags
    if (-not $internal) { Set-UsbInfo $devices[$devices.Count - 1] $att }
    $usbHandled[$vp] = $name
}

# ---------------------------------------------------------------- Stockage
foreach ($disk in Get-CimInstance Win32_DiskDrive) {
    $isUsb = $disk.InterfaceType -eq 'USB' -or $disk.PNPDeviceID -match '^(USBSTOR|SCSI\\DISK&VEN_.*&PROD_.*USB)'
    $isRemovable = $disk.MediaType -match 'Removable|amovible'
    $vols = @()
    foreach ($part in Get-CimAssociatedInstance -InputObject $disk -ResultClassName Win32_DiskPartition) {
        foreach ($ld in Get-CimAssociatedInstance -InputObject $part -ResultClassName Win32_LogicalDisk) {
            $vols += [ordered]@{ letter = $ld.DeviceID; label = $ld.VolumeName; fs = $ld.FileSystem; size = $ld.Size; free = $ld.FreeSpace }
        }
    }
    $det = [ordered]@{
        'Capacité'  = Format-Size $disk.Size
        'Interface' = if ($disk.PNPDeviceID -match 'NVME') { 'NVMe' } else { $disk.InterfaceType }
        'Type'      = if ($disk.MediaType -match 'Removable') { 'Amovible' } elseif ($disk.MediaType -match 'Fixed') { 'Fixe' } else { $disk.MediaType }
        'N° série'  = "$($disk.SerialNumber)".Trim()
    }
    foreach ($v in $vols) {
        $used = if ($v.size) { [math]::Round(100 * (1 - $v.free / $v.size)) } else { $null }
        $det["Volume $($v.letter)"] = "$(if ($v.label) { $v.label + ' · ' })$($v.fs) · $(Format-Size $v.free) libres sur $(Format-Size $v.size)$(if ($null -ne $used) { " ($used % utilisé)" })"
    }
    $conn = if ($isUsb) { 'USB' } elseif ($disk.PNPDeviceID -match 'NVME') { 'Intégré (NVMe)' } else { 'Intégré (SATA)' }
    $tags = @(); if (-not $isUsb -and -not $isRemovable) { $tags += 'internal' }
    $label = $disk.Model -replace '\s+USB Device$', '' -replace '\s+SCSI Disk Device$', ''
    $fill = $null; if ($vols.Count) { $tot = ($vols | Measure-Object size -Sum).Sum; $fr = ($vols | Measure-Object free -Sum).Sum; if ($tot) { $fill = [math]::Round(100 * (1 - $fr / $tot)) } }
    $dev = @{ Id = $disk.PNPDeviceID; Category = 'storage'; Name = $label; Connection = $conn; Details = $det; Tags = $tags }
    Add-Device @dev
    if ($null -ne $fill) { $devices[$devices.Count - 1]['usage'] = $fill }
    if ($isUsb) { Set-UsbInfo $devices[$devices.Count - 1] (Find-UsbAttachment $disk.PNPDeviceID) }
}
# Lecteurs réseau / optiques
foreach ($ld in Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=4 OR DriveType=5') {
    if ($ld.DriveType -eq 5 -and -not $ld.Size) { continue }
    $isNet = $ld.DriveType -eq 4
    Add-Device -Id "LD:$($ld.DeviceID)" -Category 'storage' -Name ($(if ($isNet) { "Lecteur réseau $($ld.DeviceID)" } else { "Lecteur optique $($ld.DeviceID)" })) `
        -Connection ($(if ($isNet) { 'Réseau' } else { 'Intégré' })) -Details ([ordered]@{ 'Chemin' = $ld.ProviderName; 'Libre' = Format-Size $ld.FreeSpace; 'Taille' = Format-Size $ld.Size })
}

# ---------------------------------------------------------------- Écrans
$tech = @{ 0 = 'VGA'; 1 = 'S-Vidéo'; 2 = 'Composite'; 3 = 'Composante'; 4 = 'DVI'; 5 = 'HDMI'; 6 = 'LVDS'; 8 = 'D-Jpn'; 9 = 'SDI'
    10 = 'DisplayPort'; 11 = 'DisplayPort intégré'; 12 = 'UDI'; 13 = 'UDI intégré'; 14 = 'SDTV'; 15 = 'Miracast (sans fil)'; 16 = 'Indirect' }
$conns = @{}; foreach ($c in Get-CimInstance -Namespace root\wmi WmiMonitorConnectionParams) { $conns[$c.InstanceName] = [int64]$c.VideoOutputTechnology }
$ids = @{}; foreach ($m in Get-CimInstance -Namespace root\wmi WmiMonitorID) { $ids[$m.InstanceName] = $m }
$modes = @{}; foreach ($m in Get-CimInstance -Namespace root\wmi WmiMonitorBasicDisplayParams) { $modes[$m.InstanceName] = $m }
function Decode($arr) { (($arr | Where-Object { $_ -gt 0 } | ForEach-Object { [char]$_ }) -join '').Trim() }
foreach ($inst in $conns.Keys) {
    $t = $conns[$inst]; $internal = $t -eq 2147483648 -or $t -eq 6 -or $t -eq 11 -or $t -eq 13
    $m = $ids[$inst]; $name = Decode $m.UserFriendlyName; $mfr = Decode $m.ManufacturerName
    $pnpId = ($inst -replace '_0$', '')
    if (-not $name) { $name = if ($internal) { 'Écran intégré' } else { $byId[$pnpId].Name } }
    if (-not $name) { $name = 'Écran' }
    $code = ($inst -split '\\')[1]
    $bp = $modes[$inst]; $diag = $null
    if ($bp -and $bp.MaxHorizontalImageSize) { $diag = '{0:N1}"' -f ([math]::Sqrt([math]::Pow($bp.MaxHorizontalImageSize, 2) + [math]::Pow($bp.MaxVerticalImageSize, 2)) / 2.54) }
    $connName = if ($internal) { 'Intégré' } elseif ($tech.ContainsKey([int]$t)) { $tech[[int]$t] } else { 'Autre' }
    $tags = @(); if ($internal) { $tags += 'internal' }
    Add-Device -Id $inst -Category 'display' -Name $name -Connection $connName -Vendor $mfr -Tags $tags -Details ([ordered]@{
        'Modèle'     = $code
        'Diagonale'  = $diag
        'N° série'   = (Decode $m.SerialNumberID) -replace '^0$', ''
        'Fabriqué'   = $(if ($m.YearOfManufacture) { "$($m.YearOfManufacture)$(if ($m.WeekOfManufacture -and $m.WeekOfManufacture -lt 54) { ", semaine $($m.WeekOfManufacture)" })" })
        'Remarque'   = $(if ($connName -eq 'DisplayPort' -and @($connectors | Where-Object { $_.type -eq 'usb-c' }).Count) { 'Via la prise USB‑C (DisplayPort alternatif) ou un port DisplayPort' })
    })
    $d = $devices[$devices.Count - 1]; $d.port = $connName
    $d.portType = switch -Regex ($connName) { 'HDMI' { 'hdmi' } 'DisplayPort' { 'dp' } 'DVI' { 'dvi' } 'VGA' { 'vga' } 'Miracast' { 'wireless' } default { 'video' } }
}
Add-Type -AssemblyName System.Windows.Forms
$screens = [System.Windows.Forms.Screen]::AllScreens

# ---------------------------------------------------------------- Clavier / souris intégrés (hors USB)
foreach ($k in Get-CimInstance Win32_Keyboard) {
    if ($k.PNPDeviceID -match 'VID_' -or $k.PNPDeviceID -match '^(BTH|HID\\\{00001124)') { continue }
    Add-Device -Id $k.PNPDeviceID -Category 'keyboard' -Name ($(if ($k.PNPDeviceID -match '^ACPI') { 'Clavier intégré' } else { $k.Name })) -Connection 'Intégré' -Tags @('internal') -Details ([ordered]@{ 'Pilote' = $k.Name; 'Disposition' = $k.Layout })
}
foreach ($p in Get-CimInstance Win32_PointingDevice) {
    if ($p.PNPDeviceID -match 'VID_' -or $p.PNPDeviceID -match '^(BTH|HID\\\{0000)') { continue }
    $isPad = $p.PNPDeviceID -match 'ELAN|SYNA|MSFT0001|I2C|ALPS|ACPI'
    $brand = if ($p.PNPDeviceID -match 'ELAN') { 'ELAN' } elseif ($p.PNPDeviceID -match 'SYNA') { 'Synaptics' } elseif ($p.PNPDeviceID -match 'ALPS') { 'Alps' }
    Add-Device -Id $p.PNPDeviceID -Category 'mouse' -Name ($(if ($isPad) { 'Pavé tactile' } else { $p.Name })) -Connection 'Intégré' -Vendor $brand -Tags @('internal') -Details ([ordered]@{ 'Pilote' = $p.Name; 'Boutons' = if ($p.NumberOfButtons) { $p.NumberOfButtons } })
}

# ---------------------------------------------------------------- Bluetooth
$btNames = @{}
foreach ($b in $all | Where-Object { $_.PNPDeviceID -match '^(BTHENUM|BTHLE)\\DEV_[0-9A-F]{12}' }) {
    $null = $b.PNPDeviceID -match 'DEV_([0-9A-F]{12})'
    $mac = ($Matches[1] -split '(..)' -ne '') -join ':'
    $isLE = $b.PNPDeviceID -like 'BTHLE*'
    $props = Get-DevProps $b @($KEY_BTCONN, $KEY_BTCOD)
    $connected = $props[$KEY_BTCONN] -eq $true
    $cod = [int64]$props[$KEY_BTCOD]; $major = ($cod -shr 8) -band 0x1F; $minor = ($cod -shr 6) -band 0x3
    $n = $b.Name
    $cat = switch ($major) {
        1 { 'usb' }; 2 { 'phone' }; 4 { 'audio' }; 6 { 'printer' }
        5 { if ($minor -eq 1) { 'keyboard' } elseif ($minor -eq 2) { 'mouse' } else { 'usb' } }
        default { $null }
    }
    if (-not $cat -or $cat -eq 'usb') {
        $cat = if ($n -match 'key|clavier|kb') { 'keyboard' } elseif ($n -match 'mouse|souris|mx (master|anywhere)|trackpad') { 'mouse' }
        elseif ($n -match 'buds|pods|jbl|bose|sony wh|headset|casque|speaker|enceinte|boom|charge|flip|soundcore|beats') { 'audio' }
        elseif ($n -match 'redmi|galaxy|iphone|pixel|xiaomi|oneplus|phone|honor|huawei|oppo') { 'phone' }
        elseif ($n -match 'controller|manette|xbox|dualsense|dualshock|pro controller') { 'usb' } else { 'usb' }
    }
    Add-Device -Id $b.PNPDeviceID -Category $cat -Name $n -Connection ($(if ($isLE) { 'Bluetooth LE' } else { 'Bluetooth' })) `
        -Status ($(if ($connected) { 'connected' } else { 'paired' })) -Details ([ordered]@{ 'Adresse' = $mac; 'État' = if ($connected) { 'Connecté' } else { 'Appairé, hors de portée ou éteint' } }) -Tags @('bluetooth')
    $d = $devices[$devices.Count - 1]; $d.port = $d.connection; $d.portType = 'bluetooth'
    if ($connected) {
        # Niveau de batterie : publié sur le nœud mains-libres (HFP) ou sur le nœud LE de l'appareil
        $raw = $mac -replace ':', ''
        $nodes = @($b) + @($all | Where-Object { $_.PNPDeviceID -like "*$raw*" -and $_.PNPDeviceID -ne $b.PNPDeviceID } | Sort-Object { $_.PNPDeviceID -notlike '*0000111E*' })
        foreach ($node in $nodes) {
            $lvl = (Get-DevProps $node @($KEY_BTBATT))[$KEY_BTBATT]
            if ($null -ne $lvl) { $d.battery = [int]$lvl; $d.details['Batterie'] = "$lvl %"; break }
        }
    }
    $btNames[$n] = $devices.Count - 1
}

# ---------------------------------------------------------------- Audio (sorties / entrées)
foreach ($a in $all | Where-Object { $_.PNPClass -eq 'AudioEndpoint' }) {
    $n = $a.Name
    $host_ = $null; foreach ($bn in $btNames.Keys) { if ($n -like "*$bn*") { $host_ = $btNames[$bn] } }
    if ($null -ne $host_) {
        $d = $devices[$host_]; $d.details['Audio'] = (@($d.details['Audio'], $n) | Where-Object { $_ }) -join ' · '; continue
    }
    $isMic = $n -match '^(Microphone|Micro|Entrée|Input|Line In|Réseau de micro|Headset Microphone|Casque micro)' -or $n -match 'Microphone|Input'
    $virtual = $n -match 'Virtual|Virtuel|Sonar|VB-Audio|Voicemeeter|NVIDIA Broadcast|CABLE'
    if ($n -match 'HDMI|NVIDIA High Definition|AMD High Definition|Intel.*Display|DisplayPort') { continue }   # son de l'écran, déjà listé
    $isJack = $n -match '^(Casque|Écouteurs|Headphones?|Headset|Line|Ligne|Entrée ligne|Sortie ligne|Micro externe|External Mic)'
    $conn = if ($virtual) { 'Virtuel' } elseif ($n -match 'USB') { 'USB' } elseif ($isJack) { 'Jack 3,5 mm' } else { 'Intégré' }
    $tags = @(); if ($virtual) { $tags += 'virtual' }; if ($conn -eq 'Intégré') { $tags += 'internal' }
    $short = if ($n -match '^(.*?)\s*\((.*)\)$') { "$($Matches[1])" } else { $n }
    $sub = if ($n -match '\((.*)\)$') { $Matches[1] }
    Add-Device -Id $a.PNPDeviceID -Category 'audio' -Name $n -Connection $conn -Tags $tags -Status ($(if ($a.ConfigManagerErrorCode -eq 0) { 'connected' } else { 'error' })) `
        -Details ([ordered]@{ 'Rôle' = if ($isMic) { 'Entrée (micro)' } else { 'Sortie' }; 'Périphérique' = $sub; 'Type' = $short })
    if ($isJack) { $d = $devices[$devices.Count - 1]; $d.port = 'Jack 3,5 mm'; $d.portType = 'jack' }
}

# ---------------------------------------------------------------- Imprimantes & scanners
foreach ($p in Get-CimInstance Win32_Printer) {
    if ($p.Name -match 'PDF|XPS|OneNote|Fax|Send To|Envoyer' -or $p.PortName -match '^(PORTPROMPT|nul|SHRFAX|FILE)') { continue }
    $conn = if ($p.PortName -match '^USB') { 'USB' } elseif ($p.PortName -match '^(WSD|IP_|\d)' -or $p.Network) { 'Réseau' } else { $p.PortName }
    Add-Device -Id "PRN:$($p.Name)" -Category 'printer' -Name $p.Name -Connection $conn -Status ($(if ($p.WorkOffline) { 'paired' } else { 'connected' })) `
        -Details ([ordered]@{ 'Port' = $p.PortName; 'Pilote' = $p.DriverName; 'Par défaut' = if ($p.Default) { 'Oui' }; 'État' = if ($p.WorkOffline) { 'Hors ligne' } else { 'Prête' } })
}

# ---------------------------------------------------------------- Caméras hors USB racine
foreach ($c in $all | Where-Object { $_.PNPClass -in 'Camera', 'Image' -and $_.PNPDeviceID -notmatch '^USB\\' }) {
    $isScanner = $c.PNPDeviceID -match 'ESCL|WSD|STI'
    if ($isScanner) {
        $prn = $devices | Where-Object { $_.category -eq 'printer' -and ($c.Name -like "*$($_.name)*" -or $_.name -like "*$($c.Name)*") } | Select-Object -First 1
        if ($prn) { $prn.details['Scanner'] = 'Oui'; continue }
    }
    Add-Device -Id $c.PNPDeviceID -Category ($(if ($isScanner) { 'printer' } else { 'camera' })) -Name $c.Name -Connection ($(if ($isScanner) { 'Réseau' } else { 'Intégré' })) `
        -Details ([ordered]@{ 'Type' = if ($isScanner) { 'Scanner' } else { 'Caméra' } })
}

# ---------------------------------------------------------------- Réseau
$ssid = $null
$wl = netsh wlan show interfaces 2>$null
foreach ($line in $wl) { if ($line -match '^\s*SSID\s*:\s*(.+)$') { $ssid = $Matches[1].Trim() } }
foreach ($n in Get-CimInstance Win32_NetworkAdapter -Filter 'PhysicalAdapter=TRUE') {
    if ($n.PNPDeviceID -notmatch '^(PCI|USB)\\' -or $n.Name -match 'Bluetooth') { continue }
    $isWifi = $n.Name -match 'Wi-?Fi|Wireless|WLAN|802\.11'
    $up = $n.NetConnectionStatus -eq 2
    $speed = if ($up -and $n.Speed) { if ($n.Speed -ge 1e9) { '{0:N1} Gbit/s' -f ($n.Speed / 1e9) } else { '{0:N0} Mbit/s' -f ($n.Speed / 1e6) } }
    $isUsb = $n.PNPDeviceID -like 'USB*'
    $tags = @(); if ($isWifi) { $tags += 'internal' }
    Add-Device -Id "NET:$($n.GUID)" -Category 'network' -Name $n.Name -Connection ($(if ($isWifi) { 'Wi-Fi' } elseif ($isUsb) { 'Ethernet (USB)' } else { 'Ethernet' })) `
        -Status ($(if ($up) { 'connected' } else { 'paired' })) -Tags $tags -Details ([ordered]@{
            'Interface' = $n.NetConnectionID; 'État' = if ($up) { 'Connecté' } elseif ($isWifi) { 'Déconnecté' } else { 'Câble débranché' }
            'Réseau' = if ($isWifi -and $up) { $ssid }; 'Débit' = $speed; 'Adresse MAC' = $n.MACAddress
        })
    $d = $devices[$devices.Count - 1]; $d.speed = $speed
    if ($isUsb) { Set-UsbInfo $d (Find-UsbAttachment $n.PNPDeviceID) } elseif (-not $isWifi) { $d.port = 'RJ45'; $d.portType = 'ethernet' }
}
# ---------------------------------------------------------------- Alimentation
$ps = [System.Windows.Forms.SystemInformation]::PowerStatus
$onAC = "$($ps.PowerLineStatus)" -eq 'Online'
$hasBattery = "$($ps.BatteryChargeStatus)" -notmatch 'NoSystemBattery'
$st = Get-CimInstance -Namespace root\wmi BatteryStatus | Select-Object -First 1
$fullMWh = (Get-CimInstance -Namespace root\wmi BatteryFullChargedCapacity | Select-Object -First 1).FullChargedCapacity
$chargeW = if ($st.Charging -and $st.ChargeRate) { [math]::Round($st.ChargeRate / 1000, 1) } else { $null }
$drawW = if (-not $onAC -and $st.DischargeRate) { [math]::Round($st.DischargeRate / 1000, 1) } else { $null }
$usbW = 0.0; foreach ($x in $devices) { if ($null -ne $x.watts -and $x.tags -notcontains 'internal') { $usbW += $x.watts } }; $usbW = [math]::Round($usbW, 1)

Add-Device -Id 'POWER:AC' -Category 'power' -Name 'Chargeur secteur' -Connection 'Secteur' `
    -Status ($(if ($onAC) { 'connected' } else { 'paired' })) -Details ([ordered]@{
        'Source' = $(if ($onAC) { 'Secteur' } elseif ($hasBattery) { 'Batterie' } else { 'Inconnue' })
        'Recharge de la batterie' = $(if ($chargeW) { '{0:N1} W' -f $chargeW } elseif ($onAC -and $hasBattery) { 'Batterie pleine, maintien' })
        'Puissance du chargeur' = 'Non communiquée par Windows'
    })
$d = $devices[$devices.Count - 1]; $d.port = 'Prise d''alimentation'; $d.portType = 'power'; $d.watts = $chargeW

$powerInfo = [ordered]@{
    onAC = $onAC; hasBattery = $hasBattery
    batteryPercent = $(if ($hasBattery) { [math]::Round($ps.BatteryLifePercent * 100) } else { $null })
    charging = [bool]$st.Charging
    chargeW = $chargeW                     # énergie qui entre dans la batterie
    drawW = $drawW                         # consommation totale du PC (mesurable sur batterie uniquement)
    voltage = $(if ($st.Voltage) { [math]::Round($st.Voltage / 1000, 2) } else { $null })
    capacityWh = $(if ($fullMWh) { [math]::Round($fullMWh / 1000, 1) } else { $null })
    remainingWh = $(if ($st.RemainingCapacity) { [math]::Round($st.RemainingCapacity / 1000, 1) } else { $null })
    remainingTime = $(if ($ps.BatteryLifeRemaining -gt 0) { '{0} h {1:D2}' -f [int][math]::Floor($ps.BatteryLifeRemaining / 3600), [int][math]::Floor(($ps.BatteryLifeRemaining % 3600) / 60) } else { $null })
    usbW = $usbW                           # somme des puissances max déclarées par les appareils USB
}
if ($hasBattery) {
    $full = (Get-CimInstance -Namespace root\wmi BatteryFullChargedCapacity | Select-Object -First 1).FullChargedCapacity
    $design = (Get-CimInstance -Namespace root\wmi BatteryStaticData | Select-Object -First 1).DesignedCapacity
    $st = Get-CimInstance -Namespace root\wmi BatteryStatus | Select-Object -First 1
    $b = Get-CimInstance Win32_Battery | Select-Object -First 1
    $pct = [math]::Round($ps.BatteryLifePercent * 100)
    $state = if ($st.Charging) { 'En charge' } elseif ($onAC) { 'Sur secteur (charge maintenue)' } else { 'Sur batterie' }
    $health = if ($full -and $design) { '{0} % de la capacité d''origine' -f [math]::Round(100 * $full / $design) }
    $power = if ($st.ChargeRate) { '{0:N1} W en charge' -f ($st.ChargeRate / 1000) } elseif ($st.DischargeRate) { '{0:N1} W consommés' -f ($st.DischargeRate / 1000) }
    $remain = if ($ps.BatteryLifeRemaining -gt 0) { '{0} h {1:D2}' -f [int][math]::Floor($ps.BatteryLifeRemaining / 3600), [int][math]::Floor(($ps.BatteryLifeRemaining % 3600) / 60) }
    Add-Device -Id 'POWER:BATTERY' -Category 'power' -Name ($(if ($b.Name) { $b.Name } else { 'Batterie' })) -Connection 'Intégré' -Tags @('internal') -Details ([ordered]@{
        'Charge' = "$pct %"; 'État' = $state; 'Autonomie estimée' = $remain
        'Santé' = $health; 'Puissance' = $power
    })
    $devices[$devices.Count - 1]['usage'] = $pct
}

# ---------------------------------------------------------------- Ordinateur
$cs = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem
[ordered]@{
    generatedAt = (Get-Date).ToString('o')
    computer    = [ordered]@{ name = $env:COMPUTERNAME; maker = $cs.Manufacturer; model = $cs.Model; os = $os.Caption; screens = $screens.Count }
    devices     = $devices
    ports       = $connectors
    power       = $powerInfo
} | ConvertTo-Json -Depth 6 -Compress
