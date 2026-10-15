# PrimaPorts — collecteur des appareils branchés sur le PC.
# Sortie : un document JSON sur stdout (UTF-8), neutre vis-à-vis de la langue :
# l'interface traduit les codes (catégories, connexions, états) et formate les nombres.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# Modules natifs (compilés une seule fois par processus : le worker reste actif)
if (-not ('PrimaPorts.Devices' -as [type])) { Add-Type -Path (Join-Path $PSScriptRoot 'Devices.cs') }
if (-not ('PrimaPorts.UsbTopology' -as [type])) { Add-Type -Path (Join-Path $PSScriptRoot 'UsbTopology.cs') }
if (-not ('System.Windows.Forms.SystemInformation' -as [type])) { Add-Type -AssemblyName System.Windows.Forms }

$devices = New-Object System.Collections.Generic.List[object]

function Add-Device {
    param($Id, $Category, $Name, $Connection, $Vendor = $null, $Info = @(), [string[]]$Tags = @(), $Status = 'connected')
    $d = [ordered]@{
        id = "$Id"; category = $Category; name = "$Name".Trim(); nameKey = $null; connection = $Connection
        status = $Status; vendor = $Vendor; tags = $Tags
        portType = $null; portRef = $null; speedMbps = $null; watts = $null; milliamps = $null; selfPowered = $false
        battery = $null; usage = $null
        info = New-Object System.Collections.Generic.List[object]
    }
    foreach ($pair in $Info) { if ($null -ne $pair[1] -and "$($pair[1])" -ne '') { $d.info.Add(@($pair[0], $pair[1])) } }
    $devices.Add($d)
    $d
}

$VENDORS = @{
    '046D' = 'Logitech'; '1532' = 'Razer'; '045E' = 'Microsoft'; '1038' = 'SteelSeries'; '0951' = 'Kingston'
    '0781' = 'SanDisk'; '090C' = 'Silicon Motion'; '05AC' = 'Apple'; '04E8' = 'Samsung'; '2717' = 'Xiaomi'
    '18D1' = 'Google'; '13D3' = 'IMC Networks'; '0BDA' = 'Realtek'; '8087' = 'Intel'; '1B1C' = 'Corsair'
    '3434' = 'Keychron'; '258A' = 'Sinowealth'; '0B05' = 'ASUS'; '17EF' = 'Lenovo'; '413C' = 'Dell'
    '03F0' = 'HP'; '04A9' = 'Canon'; '04B8' = 'Epson'; '054C' = 'Sony'; '057E' = 'Nintendo'; '0D8C' = 'C-Media'
    '1915' = 'Nordic'; '0E8D' = 'MediaTek'; '322E' = 'Sonix'; '2109' = 'VIA Labs'; '05E3' = 'Genesys Logic'
    '152D' = 'JMicron'; '174C' = 'ASMedia'; '1058' = 'Western Digital'; '0BC2' = 'Seagate'; '14CD' = 'Super Top'
    '1E7D' = 'ROCCAT'; '0C45' = 'Microdia'; '046A' = 'Cherry'; '20A0' = 'Clay Logic'; '1050' = 'Yubico'
    '0A12' = 'CSR'; '2357' = 'TP-Link'; '0846' = 'Netgear'; '2001' = 'D-Link'; '0B95' = 'ASIX'; '1A86' = 'QinHeng'
}

# ---------------------------------------------------------------- Périphériques présents (lecture native)
$all = [PrimaPorts.Devices]::Read()
$byId = @{}; $children = @{}
foreach ($n in $all) {
    $byId[$n.InstanceId.ToUpper()] = $n
    if ($n.Parent) { $p = $n.Parent.ToUpper(); if (-not $children.ContainsKey($p)) { $children[$p] = New-Object System.Collections.Generic.List[object] }; $children[$p].Add($n) }
}
function Get-Descendants($Node, [int]$Depth = 3) {
    $out = @(); $kids = $children[$Node.InstanceId.ToUpper()]
    foreach ($k in $kids) { $out += $k; if ($Depth -gt 1) { $out += Get-Descendants $k ($Depth - 1) } }
    $out
}

# ---------------------------------------------------------------- Prises USB physiques
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
        $c = [ordered]@{
            id = "$($hub.Name)|$(($g | ForEach-Object Port) -join '+')"
            type = $(if (@($g | Where-Object TypeC).Count) { 'usb-c' } else { 'usb-a' })
            usb3 = @($g | Where-Object PortSupportsUsb3).Count -gt 0
            n = $null; deviceId = $null
        }
        $connectors.Add($c)
        foreach ($l in $g) { $laneToConnector["$($l.HubInstanceId.ToUpper())|$($l.Port)"] = $c }
    }
}
# Numéro d'ordre quand plusieurs prises sont du même type (USB-A 2.0 n°1, n°2…)
foreach ($grp in $connectors | Group-Object { "$($_.type)|$($_.usb3)" }) {
    if ($grp.Count -gt 1) { $i = 1; foreach ($c in $grp.Group) { $c.n = $i; $i++ } }
}

# Remonte de l'appareil jusqu'à la prise du PC, en traversant d'éventuels hubs externes.
function Find-UsbAttachment([string]$InstanceId) {
    $node = $byId[$InstanceId.ToUpper()]; $own = $null; $hubs = @()
    for ($i = 0; $i -lt 8 -and $node -and $node.Parent; $i++) {
        $parent = $node.Parent.ToUpper()
        $lane = $laneIndex["$parent|$($node.Address)"]
        if ($lane) {
            if (-not $own) { $own = $lane }
            if ($lane.HubIsRoot) { return @{ lane = $own; root = $lane; connector = $laneToConnector["$parent|$($lane.Port)"]; hubs = $hubs } }
            $hubs += $byId[$parent].Name
        }
        $node = $byId[$parent]
    }
    $null
}

# Ajoute à un appareil USB sa prise, sa vitesse et sa puissance déclarée.
function Set-UsbInfo($Device, $Att) {
    if (-not $Att) { return }
    $l = $Att.lane; $c = $Att.connector
    if ($c) {
        $Device.portType = $c.type; $Device.portRef = $c.id
        if (-not $c.deviceId) { $c.deviceId = $Device.id }
    }
    if ($Att.hubs.Count) { $Device.info.Add(@('via', (($Att.hubs | Where-Object { $_ }) -join ' → '))) }
    if ($l.Connected) {
        $Device.speedMbps = switch ([int]$l.Speed) { 0 { 1.5 } 1 { 12 } 2 { 480 } 3 { if ($l.SuperSpeedPlus) { 10000 } else { 5000 } } }
        if ($l.MaxPowerMa -ge 0) {
            $Device.milliamps = $l.MaxPowerMa
            $Device.selfPowered = $l.SelfPowered -and $l.MaxPowerMa -eq 0
            if (-not $Device.selfPowered) { $Device.watts = [math]::Round($l.MaxPowerMa * 5 / 1000, 2) }
        }
    }
}

# ---------------------------------------------------------------- Appareils USB
$generic = '^(Périphérique USB composite|USB Composite Device|Périphérique d.entrée USB|USB Input Device|Périphérique HID|HID-compliant|Périphérique conforme aux|Périphérique clavier PIH|HID Keyboard Device|Souris HID|HID-compliant mouse|Périphérique USB|Generic USB)'
foreach ($r in $all) {
    if ($r.InstanceId -notmatch '^USB\\VID_([0-9A-F]{4})&PID_([0-9A-F]{4})\\') { continue }
    $vid = $Matches[1]; $pidv = $Matches[2]
    if ($r.InstanceId -match '&MI_|ROOT_HUB' -or ($r.Class -eq 'USB' -and $r.Name -match 'Hub|concentrateur')) { continue }
    if ($r.Service -match 'USBSTOR|UASPStor') { continue }   # traité avec les disques
    $att = Find-UsbAttachment $r.InstanceId
    # Intégré : déclaré comme tel par Windows, ou branché sur une voie interne (non accessible à l'utilisateur)
    if ($r.InLocalMachine -or ($att -and -not $att.root.UserConnectable)) { continue }

    $kids = @(Get-Descendants $r)
    $classes = @($kids | ForEach-Object { $_.Class }) + $r.Class
    if ($classes -contains 'Net' -and $classes -notcontains 'Bluetooth') { continue }   # traité dans la section Réseau
    $cat = 'usb'
    if ($classes -contains 'WPD') { $cat = 'phone' }
    elseif ($classes -contains 'Camera' -or $classes -contains 'Image') { $cat = 'camera' }
    elseif ($classes -contains 'Mouse' -or $classes -contains 'Keyboard') {
        $first = $kids | Where-Object { $_.Class -in 'Mouse', 'Keyboard' } | Sort-Object InstanceId | Select-Object -First 1
        $cat = if ($first.Class -eq 'Mouse') { 'mouse' } else { 'keyboard' }
    }
    elseif ($classes -contains 'MEDIA' -or $classes -contains 'AudioEndpoint') { $cat = 'audio' }
    elseif ($classes -contains 'Bluetooth') { $cat = 'network' }
    elseif ($classes -contains 'Printer') { $cat = 'printer' }

    $name = if ($r.Class -eq 'USB' -or -not $r.Name) { $r.BusDesc } else { $r.Name }
    if (-not $name -or $name -match $generic) {
        $better = @($kids) + $r | Where-Object { $_.Name -and $_.Name -notmatch $generic } | Select-Object -First 1
        $name = if ($better) { $better.Name } elseif ($r.BusDesc) { $r.BusDesc } else { $r.Name }
    }
    $vendor = $VENDORS[$vid]; if (-not $vendor -and $r.Manufacturer -notmatch '^\(|Standard|Microsoft') { $vendor = $r.Manufacturer }
    $functions = (@($kids | Where-Object { $_.Name -and $_.Class -notin 'USB', 'HIDClass' } | ForEach-Object { $_.Name } | Select-Object -Unique) -join ', ')

    $d = Add-Device -Id $r.InstanceId -Category $cat -Name $name -Connection 'usb' -Vendor $vendor `
        -Status $(if ($r.Problem -eq 0) { 'connected' } else { 'error' }) -Info @(
            , @('usbId', "VID $vid · PID $pidv")
            , @('functions', $functions)
            , @('driver', $r.Service)
            , @('state', $(if ($r.Problem -eq 0) { 'ok' } else { [int]$r.Problem }))
        )
    Set-UsbInfo $d $att
}

# ---------------------------------------------------------------- Stockage USB (clés, disques externes)
foreach ($disk in Get-CimInstance Win32_DiskDrive -Property DeviceID, PNPDeviceID, Model, Size, InterfaceType, MediaType, SerialNumber) {
    $att = Find-UsbAttachment $disk.PNPDeviceID
    if (-not $att -or -not $att.root.UserConnectable) { continue }   # disques internes
    $d = Add-Device -Id $disk.PNPDeviceID -Category 'storage' -Name ($disk.Model -replace '\s+(USB|SCSI Disk) Device$', '') -Connection 'usb' -Info @(
        , @('capacity', [double]$disk.Size)
        , @('media', $(if ($disk.MediaType -match 'Removable') { 'removable' } elseif ($disk.MediaType -match 'External') { 'external' } else { 'fixed' }))
        , @('serial', "$($disk.SerialNumber)".Trim())
    )
    $tot = 0.0; $free = 0.0
    foreach ($part in Get-CimAssociatedInstance -InputObject $disk -ResultClassName Win32_DiskPartition) {
        foreach ($ld in Get-CimAssociatedInstance -InputObject $part -ResultClassName Win32_LogicalDisk) {
            $d.info.Add(@('volume', [ordered]@{ letter = $ld.DeviceID; label = $ld.VolumeName; fs = $ld.FileSystem; size = [double]$ld.Size; free = [double]$ld.FreeSpace }))
            $tot += $ld.Size; $free += $ld.FreeSpace
        }
    }
    if ($tot) { $d.usage = [math]::Round(100 * (1 - $free / $tot)) }
    Set-UsbInfo $d $att
}

# ---------------------------------------------------------------- Écrans externes
$TECH = @{ 0 = 'vga'; 4 = 'dvi'; 5 = 'hdmi'; 10 = 'dp'; 15 = 'wireless-display' }
$ids = @{}; foreach ($m in Get-CimInstance -Namespace root\wmi WmiMonitorID) { $ids[$m.InstanceName] = $m }
$sizes = @{}; foreach ($m in Get-CimInstance -Namespace root\wmi WmiMonitorBasicDisplayParams) { $sizes[$m.InstanceName] = $m }
function Decode($arr) { (($arr | Where-Object { $_ -gt 0 } | ForEach-Object { [char]$_ }) -join '').Trim() }
$hasUsbC = @($connectors | Where-Object { $_.type -eq 'usb-c' }).Count -gt 0
foreach ($c in Get-CimInstance -Namespace root\wmi WmiMonitorConnectionParams) {
    $t = [int64]$c.VideoOutputTechnology
    if ($t -eq 2147483648 -or $t -in 6, 11, 13, 16) { continue }   # écran intégré ou indirect
    $conn = if ($TECH.ContainsKey([int]$t)) { $TECH[[int]$t] } else { 'video' }
    $m = $ids[$c.InstanceName]; $bp = $sizes[$c.InstanceName]
    $name = Decode $m.UserFriendlyName; if (-not $name) { $name = $byId[($c.InstanceName -replace '_0$', '').ToUpper()].Name }
    $diag = if ($bp.MaxHorizontalImageSize) { [math]::Round([math]::Sqrt([math]::Pow($bp.MaxHorizontalImageSize, 2) + [math]::Pow($bp.MaxVerticalImageSize, 2)) / 2.54, 1) }
    $d = Add-Device -Id $c.InstanceName -Category 'display' -Name $name -Connection $conn -Vendor (Decode $m.ManufacturerName) -Info @(
        , @('model', ($c.InstanceName -split '\\')[1])
        , @('diagonal', $diag)
        , @('serial', ((Decode $m.SerialNumberID) -replace '^0$', ''))
        , @('made', $(if ($m.YearOfManufacture) { [ordered]@{ year = [int]$m.YearOfManufacture; week = [int]$m.WeekOfManufacture } }))
        , @('note', $(if ($conn -eq 'dp' -and $hasUsbC) { 'usbc-dp' }))
    )
    $d.portType = $conn
}

# ---------------------------------------------------------------- Bluetooth (appareils connectés)
$btHosts = @{}
foreach ($b in $all) {
    if ($b.InstanceId -notmatch '^(BTHENUM|BTHLE)\\DEV_([0-9A-F]{12})' -or -not $b.BtConnected) { continue }
    $raw = $Matches[2]; $isLE = $Matches[1] -eq 'BTHLE'
    $cod = $b.BtClassOfDevice; $major = ($cod -shr 8) -band 0x1F; $minor = ($cod -shr 6) -band 0x3
    $n = $b.Name
    $cat = switch ($major) { 2 { 'phone' } 4 { 'audio' } 6 { 'printer' } 5 { if ($minor -eq 1) { 'keyboard' } elseif ($minor -eq 2) { 'mouse' } } default { $null } }
    if (-not $cat) {
        $cat = if ($n -match 'key|clavier|kb') { 'keyboard' } elseif ($n -match 'mouse|souris|mx (master|anywhere)|trackpad') { 'mouse' }
        elseif ($n -match 'buds|pods|jbl|bose|sony wh|headset|casque|speaker|enceinte|boom|charge|flip|soundcore|beats') { 'audio' }
        elseif ($n -match 'redmi|galaxy|iphone|pixel|xiaomi|oneplus|phone|honor|huawei|oppo') { 'phone' } else { 'usb' }
    }
    # Niveau de batterie : publié sur le nœud de l'appareil ou sur son profil mains-libres
    $batt = if ($b.BtBattery -ge 0) { $b.BtBattery } else { ($all | Where-Object { $_.BtBattery -ge 0 -and $_.InstanceId -like "*$raw*" } | Select-Object -First 1).BtBattery }
    $d = Add-Device -Id $b.InstanceId -Category $cat -Name $n -Connection $(if ($isLE) { 'bluetooth-le' } else { 'bluetooth' }) -Tags @('bluetooth') -Info @(
        , @('btAddress', (($raw -split '(..)' -ne '') -join ':'))
    )
    $d.portType = 'bluetooth'
    if ($null -ne $batt -and $batt -ge 0) { $d.battery = [int]$batt }
    $btHosts[$n] = $d
}

# ---------------------------------------------------------------- Audio analogique (jack)
foreach ($a in $all) {
    if ($a.Class -ne 'AudioEndpoint') { continue }
    $n = $a.Name
    $host_ = $null; foreach ($bn in $btHosts.Keys) { if ($n -like "*$bn*") { $host_ = $btHosts[$bn] } }
    if ($host_) { $host_.info.Add(@('audio', $n)); continue }
    # Seuls les casques / lignes branchés en jack sont des ports actifs ; l'USB est déjà listé, le reste est intégré ou virtuel
    if ($n -notmatch '^(Casque|Écouteurs|Headphones?|Headset|Line|Ligne|Entrée ligne|Sortie ligne|Micro externe|External Mic)' -or $n -match 'USB|Virtual|Virtuel') { continue }
    $role = if ($n -match 'Micro|Mic|Entrée|Input|Line In') { 'in' } else { 'out' }
    $d = Add-Device -Id $a.InstanceId -Category 'audio' -Name $n -Connection 'jack' -Status $(if ($a.Problem -eq 0) { 'connected' } else { 'error' }) -Info @(
        , @('role', $role)
    )
    $d.portType = 'jack'
}

# ---------------------------------------------------------------- Réseau filaire (câble branché)
foreach ($n in Get-CimInstance -Namespace root/StandardCimv2 MSFT_NetAdapter -Filter 'ConnectorPresent=TRUE AND MediaConnectState=1' -Property Name, InterfaceDescription, PnPDeviceID, DeviceID, NdisPhysicalMedium, ReceiveLinkSpeed, PermanentAddress) {
    if ($n.NdisPhysicalMedium -in 9, 10, 8) { continue }   # Wi-Fi, Bluetooth, WWAN : sans fil, intégrés
    $isUsb = "$($n.PnPDeviceID)" -like 'USB*'
    $mac = ("$($n.PermanentAddress)" -split '(..)' -ne '') -join ':'
    $d = Add-Device -Id "NET:$($n.DeviceID)" -Category 'network' -Name $n.InterfaceDescription -Connection $(if ($isUsb) { 'ethernet-usb' } else { 'ethernet' }) -Info @(
        , @('iface', $n.Name)
        , @('mac', $mac)
    )
    $d.speedMbps = [math]::Round($n.ReceiveLinkSpeed / 1e6)
    if ($isUsb) { Set-UsbInfo $d (Find-UsbAttachment $n.PnPDeviceID) } else { $d.portType = 'ethernet' }
}

# ---------------------------------------------------------------- Alimentation
$ps = [System.Windows.Forms.SystemInformation]::PowerStatus
$onAC = "$($ps.PowerLineStatus)" -eq 'Online'
$hasBattery = "$($ps.BatteryChargeStatus)" -notmatch 'NoSystemBattery'
$st = Get-CimInstance -Namespace root\wmi BatteryStatus | Select-Object -First 1
$fullMWh = (Get-CimInstance -Namespace root\wmi BatteryFullChargedCapacity | Select-Object -First 1).FullChargedCapacity
$chargeW = if ($st.Charging -and $st.ChargeRate) { [math]::Round($st.ChargeRate / 1000, 1) } else { $null }
$drawW = if (-not $onAC -and $st.DischargeRate) { [math]::Round($st.DischargeRate / 1000, 1) } else { $null }
$usbW = 0.0; foreach ($x in $devices) { if ($null -ne $x.watts) { $usbW += $x.watts } }

if ($onAC) {
    $d = Add-Device -Id 'POWER:AC' -Category 'power' -Name '' -Connection 'ac' -Info @(, @('charge', $(if ($chargeW) { $chargeW } elseif ($hasBattery) { 'full' })))
    $d.nameKey = 'charger'; $d.portType = 'power'; $d.watts = $chargeW
}

$powerInfo = [ordered]@{
    onAC = $onAC; hasBattery = $hasBattery
    batteryPercent = $(if ($hasBattery) { [math]::Round($ps.BatteryLifePercent * 100) } else { $null })
    charging = [bool]$st.Charging
    chargeW = $chargeW                     # énergie qui entre dans la batterie
    drawW = $drawW                         # consommation totale du PC (mesurable sur batterie uniquement)
    voltage = $(if ($st.Voltage) { [math]::Round($st.Voltage / 1000, 2) } else { $null })
    capacityWh = $(if ($fullMWh) { [math]::Round($fullMWh / 1000, 1) } else { $null })
    remainingWh = $(if ($st.RemainingCapacity) { [math]::Round($st.RemainingCapacity / 1000, 1) } else { $null })
    remainingMinutes = $(if ($ps.BatteryLifeRemaining -gt 0) { [int][math]::Floor($ps.BatteryLifeRemaining / 60) } else { $null })
    usbW = [math]::Round($usbW, 1)         # somme des puissances max déclarées par les appareils USB
}

# ---------------------------------------------------------------- Ordinateur (ne change pas : mis en cache)
if (-not $global:PP_Computer) {
    $cs = Get-CimInstance Win32_ComputerSystem -Property Manufacturer, Model
    $os = Get-CimInstance Win32_OperatingSystem -Property Caption
    $global:PP_Computer = [ordered]@{ name = $env:COMPUTERNAME; maker = $cs.Manufacturer; model = $cs.Model; os = $os.Caption }
}

[ordered]@{
    generatedAt = (Get-Date).ToString('o')
    computer    = $global:PP_Computer
    devices     = $devices
    ports       = $connectors
    power       = $powerInfo
} | ConvertTo-Json -Depth 6 -Compress
