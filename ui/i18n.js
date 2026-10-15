// PrimaPorts — textes et mise en forme, en français et en anglais.
// Partagé par l'interface (window.I18N) et le processus principal (require) : notifications, menu de l'icône.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STRINGS = {
    fr: {
      locale: 'fr-FR',
      'app.tagline': 'Ports actifs du PC',
      'bar.live': 'En direct', 'bar.liveTitle': 'Mise à jour en temps réel', 'bar.analyzing': 'Analyse du PC…',
      'bar.refresh': 'Réanalyser (F5)', 'bar.more': "Plus d'options", 'bar.themeLight': 'Thème clair', 'bar.themeDark': 'Thème sombre',
      'menu.export': 'Exporter', 'menu.csv': 'Tableur (.csv)', 'menu.json': 'Données (.json)', 'menu.txt': 'Rapport texte (.txt)',
      'menu.copy': 'Copier le rapport', 'menu.login': 'Lancer au démarrage de Windows',
      'menu.switchLang': 'Switch to English',
      'ports.title': 'Prises du PC', 'ports.used': '{n} prise USB utilisée sur {total}', 'ports.usedMany': '{n} prises USB utilisées sur {total}',
      'ports.none': 'Aucune prise utilisée', 'ports.noneHint': 'Branchez un appareil : sa prise apparaîtra ici.',
      'ports.wireless': 'Sans fil', 'ports.many': '{n} appareils', 'ports.toBattery': '{w} W vers la batterie', 'ports.ac': 'Secteur',
      'ports.analog': 'Audio analogique', 'ports.wired': 'Réseau filaire', 'ports.videoOut': 'Sortie vidéo',
      'dev.title': 'Appareils connectés · {n}', 'dev.search': 'Rechercher', 'dev.searchLabel': 'Rechercher un appareil',
      'dev.details': 'Détails de {name}', 'dev.empty': 'Rien de branché', 'dev.emptyHint': 'Branchez un appareil : il apparaîtra ici.',
      'dev.noResult': 'Aucun résultat', 'dev.noResultHint': 'Rien ne correspond à « {q} ».', 'dev.maxPower': 'Puissance maximale déclarée',
      'dev.battery': "Batterie de l'appareil", 'dev.error': 'Analyse impossible',
      'power.title': 'Alimentation', 'power.onAC': 'Sur secteur', 'power.charging': 'Sur secteur · en charge', 'power.onBattery': 'Sur batterie',
      'power.drawCap': 'consommés par le PC en ce moment (mesure réelle)', 'power.measuring': 'Mesure en cours…',
      'power.estCap': 'tirés du chargeur en ce moment (estimation)', 'power.of': 'sur {w} W',
      'power.chargeCap': 'entrent dans la batterie (recharge seule)', 'power.fullCap': 'Batterie pleine : la recharge est au repos.',
      'power.hint': "Pour connaître la consommation du PC, débranchez le chargeur une dizaine de secondes : PrimaPorts la mesure et s'en sert ensuite comme estimation sur secteur.",
      'power.pc': 'PC ≈ {w} W', 'power.recharge': 'Recharge {w} W', 'power.margin': 'Marge {w} W',
      'power.charger': 'Chargeur', 'power.chargerMax': '{w} W max', 'power.edit': 'Modifier', 'power.set': 'Indiquer sa puissance',
      'power.unplugged': 'Débranché', 'power.rechargeRow': 'Recharge batterie', 'power.idle': 'Au repos',
      'power.pcRow': 'PC (estimé)', 'power.measuredOn': 'mesuré sur batterie, {when}', 'power.notMeasured': 'Pas encore mesuré',
      'power.usbRow': 'Appareils USB (max déclaré)', 'power.battery': 'Batterie', 'power.energy': 'Énergie stockée',
      'power.voltage': 'Tension', 'power.runtime': 'Autonomie estimée', 'power.chargerInput': 'Puissance du chargeur en watts',
      'power.save': 'OK', 'power.cancel': 'Annuler', 'power.range': 'Puissance attendue entre 5 et 300 W.',
      'log.title': 'Activité', 'log.clear': 'Effacer', 'log.empty': 'Branchez ou débranchez un appareil : il apparaîtra ici.',
      'ev.added': 'Branché', 'ev.removed': 'Débranché', 'ev.exported': 'Exporté', 'ev.copied': 'Rapport copié', 'ev.clipboard': 'Presse-papiers',
      'cat.storage': 'Stockage', 'cat.display': 'Écran', 'cat.keyboard': 'Clavier', 'cat.mouse': 'Souris', 'cat.gamepad': 'Manette', 'cat.audio': 'Audio',
      'cat.camera': 'Caméra', 'cat.phone': 'Téléphone', 'cat.network': 'Réseau', 'cat.printer': 'Imprimante', 'cat.power': 'Alimentation',
      'cat.usb': 'Périphérique',
      'name.charger': 'Chargeur secteur',
      'port.n': ' n°{n}', 'port.power': "Prise d'alimentation", 'port.jack': 'Jack 3,5 mm', 'port.ethernet': 'Ethernet (RJ45)',
      'port.ethernet-usb': 'Ethernet (USB)', 'port.wireless-display': 'Écran sans fil', 'port.video': 'Vidéo', 'port.ac': 'Secteur',
      'port.upTo': 'jusqu’à {v}',
      'info.port': 'Prise', 'info.speed': 'Vitesse négociée', 'info.power': 'Puissance demandée', 'info.powerValue': '{w} W max ({ma} mA sous 5 V)',
      'info.selfPowered': 'Alimentation propre (secteur ou batterie)', 'info.battery': 'Batterie', 'info.usbId': 'Identifiant',
      'info.functions': 'Fonctions', 'info.driver': 'Pilote', 'info.state': 'État', 'info.state.ok': 'Fonctionne correctement',
      'info.state.err': 'Erreur {n}', 'info.via': 'Via', 'info.capacity': 'Capacité', 'info.media': 'Type',
      'info.media.removable': 'Amovible', 'info.media.external': 'Disque externe', 'info.media.fixed': 'Fixe', 'info.serial': 'N° série',
      'info.volume': 'Volume {letter}', 'info.volumeValue': '{fs} · {free} libres sur {size} ({used} % utilisé)',
      'info.model': 'Modèle', 'info.diagonal': 'Diagonale', 'info.made': 'Fabriqué', 'info.madeValue': '{year}, semaine {week}',
      'info.note': 'Remarque', 'info.note.usbc-dp': 'Via la prise USB‑C (DisplayPort alternatif) ou un port DisplayPort',
      'info.btAddress': 'Adresse', 'info.audio': 'Audio', 'info.role': 'Rôle', 'info.role.in': 'Entrée (micro)', 'info.role.out': 'Sortie',
      'info.iface': 'Interface', 'info.mac': 'Adresse MAC', 'info.rate': 'Débit', 'info.charge': 'Recharge de la batterie',
      'info.charge.full': 'Batterie pleine, maintien', 'info.windowsId': 'Identifiant Windows',
      'size.units': ['o', 'Ko', 'Mo', 'Go', 'To'],
      'tray.open': 'Ouvrir PrimaPorts', 'tray.refresh': 'Réanalyser', 'tray.login': 'Lancer au démarrage de Windows', 'tray.quit': 'Quitter',
      'tray.tooltip': 'PrimaPorts — {n} port actif', 'tray.tooltipMany': 'PrimaPorts — {n} ports actifs',
      'notif.stillRunning': 'PrimaPorts reste actif', 'notif.stillRunningBody': 'Il continue de surveiller vos ports depuis la zone de notification.',
      'export.report': 'PrimaPorts — {name}', 'export.generated': 'Généré le {date}', 'export.ports': 'PRISES', 'export.free': 'libre',
      'export.devices': 'APPAREILS CONNECTÉS', 'export.power': 'ALIMENTATION', 'export.batteryAt': 'batterie {p} %',
      'export.recharge': 'Recharge : {w} W', 'export.draw': 'Consommation : {w} W', 'export.usb': 'Appareils USB (max déclaré) : {w} W',
      'export.cols': ['Appareil', 'Type', 'Marque', 'Prise', 'Vitesse', 'Puissance (W)', 'Batterie (%)', 'Identifiant'],
      'export.filter.csv': 'Tableur CSV', 'export.filter.json': 'Données JSON', 'export.filter.txt': 'Texte',
    },
    en: {
      locale: 'en-US',
      'app.tagline': 'Active PC ports',
      'bar.live': 'Live', 'bar.liveTitle': 'Real-time updates', 'bar.analyzing': 'Scanning your PC…',
      'bar.refresh': 'Rescan (F5)', 'bar.more': 'More options', 'bar.themeLight': 'Light theme', 'bar.themeDark': 'Dark theme',
      'menu.export': 'Export', 'menu.csv': 'Spreadsheet (.csv)', 'menu.json': 'Data (.json)', 'menu.txt': 'Text report (.txt)',
      'menu.copy': 'Copy report', 'menu.login': 'Start with Windows',
      'menu.switchLang': 'Passer en français',
      'ports.title': 'PC ports', 'ports.used': '{n} of {total} USB ports in use', 'ports.usedMany': '{n} of {total} USB ports in use',
      'ports.none': 'No port in use', 'ports.noneHint': 'Plug in a device: its port will show up here.',
      'ports.wireless': 'Wireless', 'ports.many': '{n} devices', 'ports.toBattery': '{w} W to the battery', 'ports.ac': 'Mains power',
      'ports.analog': 'Analog audio', 'ports.wired': 'Wired network', 'ports.videoOut': 'Video output',
      'dev.title': 'Connected devices · {n}', 'dev.search': 'Search', 'dev.searchLabel': 'Search for a device',
      'dev.details': '{name} details', 'dev.empty': 'Nothing plugged in', 'dev.emptyHint': 'Plug in a device: it will show up here.',
      'dev.noResult': 'No results', 'dev.noResultHint': 'Nothing matches “{q}”.', 'dev.maxPower': 'Maximum declared power',
      'dev.battery': 'Device battery', 'dev.error': 'Scan failed',
      'power.title': 'Power', 'power.onAC': 'On AC power', 'power.charging': 'On AC power · charging', 'power.onBattery': 'On battery',
      'power.drawCap': 'used by the PC right now (measured)', 'power.measuring': 'Measuring…',
      'power.estCap': 'drawn from the charger right now (estimate)', 'power.of': 'of {w} W',
      'power.chargeCap': 'going into the battery (charging only)', 'power.fullCap': 'Battery full: charging is idle.',
      'power.hint': "To find out how much power your PC uses, unplug the charger for about ten seconds: PrimaPorts measures it and then uses it as an estimate on AC power.",
      'power.pc': 'PC ≈ {w} W', 'power.recharge': 'Charging {w} W', 'power.margin': 'Headroom {w} W',
      'power.charger': 'Charger', 'power.chargerMax': '{w} W max', 'power.edit': 'Edit', 'power.set': 'Set its wattage',
      'power.unplugged': 'Unplugged', 'power.rechargeRow': 'Battery charging', 'power.idle': 'Idle',
      'power.pcRow': 'PC (estimated)', 'power.measuredOn': 'measured on battery, {when}', 'power.notMeasured': 'Not measured yet',
      'power.usbRow': 'USB devices (declared max)', 'power.battery': 'Battery', 'power.energy': 'Stored energy',
      'power.voltage': 'Voltage', 'power.runtime': 'Estimated runtime', 'power.chargerInput': 'Charger wattage',
      'power.save': 'OK', 'power.cancel': 'Cancel', 'power.range': 'Expected between 5 and 300 W.',
      'log.title': 'Activity', 'log.clear': 'Clear', 'log.empty': 'Plug or unplug a device: it will show up here.',
      'ev.added': 'Plugged in', 'ev.removed': 'Unplugged', 'ev.exported': 'Exported', 'ev.copied': 'Report copied', 'ev.clipboard': 'Clipboard',
      'cat.storage': 'Storage', 'cat.display': 'Display', 'cat.keyboard': 'Keyboard', 'cat.mouse': 'Mouse', 'cat.gamepad': 'Controller', 'cat.audio': 'Audio',
      'cat.camera': 'Camera', 'cat.phone': 'Phone', 'cat.network': 'Network', 'cat.printer': 'Printer', 'cat.power': 'Power',
      'cat.usb': 'Device',
      'name.charger': 'AC charger',
      'port.n': ' #{n}', 'port.power': 'Power input', 'port.jack': '3.5 mm jack', 'port.ethernet': 'Ethernet (RJ45)',
      'port.ethernet-usb': 'Ethernet (USB)', 'port.wireless-display': 'Wireless display', 'port.video': 'Video', 'port.ac': 'Mains power',
      'port.upTo': 'up to {v}',
      'info.port': 'Port', 'info.speed': 'Negotiated speed', 'info.power': 'Requested power', 'info.powerValue': '{w} W max ({ma} mA at 5 V)',
      'info.selfPowered': 'Self-powered (mains or battery)', 'info.battery': 'Battery', 'info.usbId': 'Identifier',
      'info.functions': 'Functions', 'info.driver': 'Driver', 'info.state': 'Status', 'info.state.ok': 'Working properly',
      'info.state.err': 'Error {n}', 'info.via': 'Via', 'info.capacity': 'Capacity', 'info.media': 'Type',
      'info.media.removable': 'Removable', 'info.media.external': 'External drive', 'info.media.fixed': 'Fixed', 'info.serial': 'Serial number',
      'info.volume': 'Volume {letter}', 'info.volumeValue': '{fs} · {free} free of {size} ({used}% used)',
      'info.model': 'Model', 'info.diagonal': 'Diagonal', 'info.made': 'Manufactured', 'info.madeValue': '{year}, week {week}',
      'info.note': 'Note', 'info.note.usbc-dp': 'Through the USB‑C port (DisplayPort Alt Mode) or a DisplayPort port',
      'info.btAddress': 'Address', 'info.audio': 'Audio', 'info.role': 'Role', 'info.role.in': 'Input (microphone)', 'info.role.out': 'Output',
      'info.iface': 'Interface', 'info.mac': 'MAC address', 'info.rate': 'Link speed', 'info.charge': 'Battery charging',
      'info.charge.full': 'Battery full, maintaining', 'info.windowsId': 'Windows identifier',
      'size.units': ['B', 'KB', 'MB', 'GB', 'TB'],
      'tray.open': 'Open PrimaPorts', 'tray.refresh': 'Rescan', 'tray.login': 'Start with Windows', 'tray.quit': 'Quit',
      'tray.tooltip': 'PrimaPorts — {n} active port', 'tray.tooltipMany': 'PrimaPorts — {n} active ports',
      'notif.stillRunning': 'PrimaPorts is still running', 'notif.stillRunningBody': 'It keeps watching your ports from the notification area.',
      'export.report': 'PrimaPorts — {name}', 'export.generated': 'Generated on {date}', 'export.ports': 'PORTS', 'export.free': 'free',
      'export.devices': 'CONNECTED DEVICES', 'export.power': 'POWER', 'export.batteryAt': 'battery {p}%',
      'export.recharge': 'Charging: {w} W', 'export.draw': 'Consumption: {w} W', 'export.usb': 'USB devices (declared max): {w} W',
      'export.cols': ['Device', 'Type', 'Brand', 'Port', 'Speed', 'Power (W)', 'Battery (%)', 'Identifier'],
      'export.filter.csv': 'CSV spreadsheet', 'export.filter.json': 'JSON data', 'export.filter.txt': 'Text',
    },
  };

  // Langue effective : réglage explicite, sinon langue du système (français si elle commence par « fr », anglais sinon)
  const resolve = (pref, systemLocale) => (pref === 'fr' || pref === 'en') ? pref : (/^fr/i.test(systemLocale || '') ? 'fr' : 'en');

  function create(lang) {
    const S = STRINGS[lang] || STRINGS.en;
    const t = (key, params) => {
      let s = S[key] ?? STRINGS.fr[key] ?? key;
      if (params && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ''));
      return s;
    };
    const num = (n, d = 1) => Number(n).toLocaleString(S.locale, { maximumFractionDigits: d });
    const size = bytes => {
      if (!bytes) return '';
      let v = bytes, i = 0;
      while (v >= 1000 && i < 4) { v /= 1000; i++; }
      return `${Number(v).toLocaleString(S.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${S['size.units'][i]}`;
    };
    const rate = mbps => mbps >= 1000 ? `${num(mbps / 1000)} Gbit/s` : `${num(mbps)} Mbit/s`;
    const usbGen = mbps => mbps >= 5000 ? 'USB 3' : mbps >= 480 ? 'USB 2.0' : 'USB 1.1';
    const speed = mbps => `${usbGen(mbps)} · ${rate(mbps)}`;

    // Nom d'une prise : « USB‑A 2.0 n°1 », « USB‑C », « HDMI », « Jack 3,5 mm »…
    function portLabel(p) {
      if (!p || !p.type) return '';
      const n = p.n ? t('port.n', { n: p.n }) : '';
      switch (p.type) {
        case 'usb-c': return 'USB‑C' + n;
        case 'usb-a': return (p.usb3 ? 'USB‑A 3' : 'USB‑A 2.0') + n;
        case 'hdmi': return 'HDMI';
        case 'dp': return 'DisplayPort';
        case 'dvi': return 'DVI';
        case 'vga': return 'VGA';
        case 'bluetooth': return 'Bluetooth';
        default: return t('port.' + p.type);
      }
    }
    const portStandard = p => p.usb3 ? `USB 3 · ${t('port.upTo', { v: '5 Gbit/s' })}` : `USB 2.0 · ${t('port.upTo', { v: '480 Mbit/s' })}`;
    const connLabel = c => ({ usb: 'USB', bluetooth: 'Bluetooth', 'bluetooth-le': 'Bluetooth LE', hdmi: 'HDMI', dp: 'DisplayPort', dvi: 'DVI', vga: 'VGA' }[c] || t('port.' + c));
    const deviceName = d => d.nameKey ? t('name.' + d.nameKey) : d.name;
    const category = c => t('cat.' + c);

    // Lignes de détail d'un appareil : [libellé, valeur, police à chasse fixe ?]
    function infoRows(d, ports) {
      const rows = [];
      const port = ports && d.portRef ? ports.find(p => p.id === d.portRef) : null;
      if (port) rows.push([t('info.port'), `${portLabel(port)} (${portStandard(port)})`]);
      if (d.speedMbps) rows.push([d.category === 'network' ? t('info.rate') : t('info.speed'), d.portType && d.portType.startsWith('usb') ? speed(d.speedMbps) : rate(d.speedMbps)]);
      if (d.selfPowered) rows.push([t('info.power'), t('info.selfPowered')]);
      else if (d.watts != null && d.milliamps != null) rows.push([t('info.power'), t('info.powerValue', { w: num(d.watts), ma: d.milliamps })]);
      if (d.battery != null) rows.push([t('info.battery'), `${d.battery} %`]);
      const audio = [];
      for (const [k, v] of d.info || []) {
        switch (k) {
          case 'state': rows.push([t('info.state'), v === 'ok' ? t('info.state.ok') : t('info.state.err', { n: v })]); break;
          case 'capacity': rows.push([t('info.capacity'), size(v)]); break;
          case 'media': rows.push([t('info.media'), t('info.media.' + v)]); break;
          case 'volume': rows.push([t('info.volume', { letter: v.letter }), (v.label ? v.label + ' · ' : '') + t('info.volumeValue', {
            fs: v.fs, free: size(v.free), size: size(v.size), used: v.size ? Math.round(100 * (1 - v.free / v.size)) : '?' })]); break;
          case 'diagonal': rows.push([t('info.diagonal'), `${num(v)}"`]); break;
          case 'made': rows.push([t('info.made'), v.week && v.week < 54 ? t('info.madeValue', v) : String(v.year)]); break;
          case 'note': rows.push([t('info.note'), t('info.note.' + v)]); break;
          case 'role': rows.push([t('info.role'), t('info.role.' + v)]); break;
          case 'charge': rows.push([t('info.charge'), v === 'full' ? t('info.charge.full') : `${num(v)} W`]); break;
          case 'audio': audio.push(v); break;
          default: rows.push([t('info.' + k), String(v), k === 'mac' || k === 'btAddress']);
        }
      }
      if (audio.length) rows.push([t('info.audio'), audio.join(' · ')]);
      rows.push([t('info.windowsId'), d.id, true]);
      return rows;
    }

    return { lang, locale: S.locale, t, num, size, rate, speed, portLabel, portStandard, connLabel, deviceName, category, infoRows };
  }

  return { create, resolve, languages: ['fr', 'en'] };
});
