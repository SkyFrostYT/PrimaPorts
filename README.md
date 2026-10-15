<div align="center">

<img src="build/icon.png" alt="" width="96">

# PrimaPorts

**Ce qui est branché sur votre PC, sur quelle prise, et ce que ça consomme. En temps réel.**

**Français** · [English](README.en.md)

[![Dernière version](https://img.shields.io/github/v/release/SkyFrostYT/PrimaPorts?label=version&color=16a35a)](https://github.com/SkyFrostYT/PrimaPorts/releases/latest)
![Windows 10 / 11](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4)
[![Téléchargements](https://img.shields.io/github/downloads/SkyFrostYT/PrimaPorts/total?label=t%C3%A9l%C3%A9chargements&color=444852)](https://github.com/SkyFrostYT/PrimaPorts/releases)

### [⬇ Télécharger PrimaPorts pour Windows](https://github.com/SkyFrostYT/PrimaPorts/releases/latest)

</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshot-dark.png">
  <img src="docs/screenshot-light.png" alt="Fenêtre de PrimaPorts : prises utilisées, appareils connectés, alimentation et activité">
</picture>

## Pourquoi PrimaPorts ?

Windows sait parfaitement ce qui est branché sur votre ordinateur, mais l'information est éparpillée
dans le Gestionnaire de périphériques, les paramètres Bluetooth et ceux de l'alimentation.
PrimaPorts rassemble tout dans une seule fenêtre claire : un coup d'œil suffit pour savoir **quelle
prise est utilisée, par quoi, à quelle vitesse et avec quelle puissance**.

## Fonctionnalités

- **Prises du PC** : chaque prise occupée (USB‑A, USB‑C, HDMI, DisplayPort, jack, Ethernet, Bluetooth, alimentation) avec l'appareil qui y est branché.
- **Appareils connectés** : souris, claviers, clés USB et disques, écrans, casques, téléphones… avec la prise exacte, la vitesse négociée (12 Mbit/s, 480 Mbit/s, 5 Gbit/s…) et la puissance que chaque appareil USB demande.
- **Bluetooth** : seuls les appareils réellement connectés apparaissent, avec leur niveau de batterie quand ils le communiquent.
- **Alimentation** : puissance tirée du chargeur, recharge de la batterie, consommation du PC mesurée sur batterie, capacité et tension de la batterie.
- **Temps réel** : un appareil apparaît dès qu'on le branche et disparaît dès qu'on le retire. Le journal d'activité garde la trace de chaque branchement.
- **Discret** : fermer la fenêtre la range près de l'horloge. PrimaPorts continue de veiller et envoie une notification Windows à chaque branchement.
- **Pratique** : lancement au démarrage de Windows, export en CSV, JSON ou texte, recherche rapide (`Ctrl K`), thème clair ou sombre, interface qui s'adapte à la taille de l'écran.

<div align="center">
  <img src="docs/screenshot-details.png" alt="Détail d'un appareil : prise utilisée, vitesse négociée et puissance demandée" width="88%">
  <br><sub>Le détail d'un appareil : prise, vitesse, puissance, identifiants.</sub>
</div>

## Installation

1. Téléchargez la [dernière version](https://github.com/SkyFrostYT/PrimaPorts/releases/latest) :
   - **`PrimaPorts-Setup-x.y.z.exe`** : installeur, avec raccourcis sur le Bureau et dans le menu Démarrer (recommandé) ;
   - **`PrimaPorts-x.y.z-portable.exe`** : version sans installation, à lancer directement.
2. Lancez le fichier. L'exécutable n'étant pas signé numériquement, Windows SmartScreen peut afficher
   « Windows a protégé votre ordinateur » : cliquez sur **Informations complémentaires**, puis **Exécuter quand même**.

**Configuration requise :** Windows 10 ou 11, 64 bits. Aucun droit administrateur n'est nécessaire.

## Utilisation

| Action | Comment |
| --- | --- |
| Voir le détail d'un appareil | Cliquer sur sa ligne, ou sur sa prise dans « Prises du PC » |
| Indiquer la puissance du chargeur | Panneau Alimentation → *Indiquer sa puissance* |
| Mesurer la consommation du PC | Débrancher le chargeur une dizaine de secondes |
| Exporter, lancer au démarrage | Menu **…** en haut à droite |
| Réanalyser · Rechercher · Zoom | `F5` · `Ctrl K` · `Ctrl +` / `Ctrl -` / `Ctrl 0` |
| Quitter vraiment | Clic droit sur l'icône près de l'horloge → *Quitter* |

## Vie privée

PrimaPorts fonctionne **entièrement hors ligne** : aucune connexion Internet, aucune télémétrie, aucun compte.
Le journal et les réglages restent sur votre PC, dans `%APPDATA%\PrimaPorts`.

## Comment ça marche

- Les appareils sont lus via les interfaces de Windows (CIM/WMI et Plug and Play).
- Les prises USB physiques, leur type (USB‑A ou USB‑C), la vitesse négociée et la puissance déclarée sont lues directement auprès des contrôleurs USB, comme le fait l'outil USBView de Microsoft.
- Windows signale chaque branchement et chaque changement d'alimentation, et PrimaPorts met l'affichage à jour aussitôt.
- L'application est construite avec Electron ; la collecte est assurée par PowerShell et un petit module C#.

## Bon à savoir

- La puissance affichée pour un appareil USB est **le maximum qu'il déclare**, pas une mesure en direct.
- Windows ne communique pas la puissance du chargeur : vous l'indiquez une fois dans le panneau Alimentation.
- Sur secteur, Windows ne mesure que la recharge de la batterie. La consommation du PC est donc **estimée** à partir des mesures faites sur batterie.
- Seules les prises USB sont connues à l'avance. Une prise HDMI, jack ou Ethernet n'apparaît que lorsqu'elle sert.
- Avec un adaptateur USB‑C vers HDMI, Windows indique souvent « DisplayPort ».

## Compiler depuis les sources

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install
npm start
```

Pour produire l'installeur et la version portable dans `dist/` :

```bash
npm run dist
```

| Dossier / fichier | Rôle |
| --- | --- |
| `app/` | Application Electron : fenêtre, icône de notification, notifications, moteur de collecte et journal. |
| `ui/` | Interface (HTML, CSS, JavaScript). |
| `collector/collect.ps1` | Inventaire des appareils via Windows (CIM/WMI, Plug and Play). |
| `collector/UsbTopology.cs` | Lecture des contrôleurs USB : prises, USB‑C, vitesse, puissance. |
| `collector/worker.ps1` · `watcher.ps1` | Collecteur gardé actif et écoute des événements de branchement. |
| `build/` | Icônes et script qui les génère (`python build/make-icons.py`). |
