# PrimaPorts

Petit logiciel Windows qui montre, en temps réel, ce qui est branché sur le PC et sur quelle prise :
clés USB et disques, souris, claviers, écrans (HDMI, DisplayPort…), casques, téléphones, appareils
Bluetooth connectés, câble Ethernet, chargeur.

Pour chaque appareil : la prise exacte (USB‑A 3, USB‑C, USB‑A 2.0 n°1…), la vitesse négociée, la puissance
maximale qu'il déclare et, en Bluetooth, son niveau de batterie. Le panneau Alimentation indique ce que tire
le PC sur le chargeur, la recharge de la batterie et la consommation mesurée sur batterie.

Ne sont pas listés : les composants intégrés (clavier, pavé tactile, webcam, écran interne, SSD, Wi‑Fi),
les appareils Bluetooth appairés mais éteints, l'audio virtuel et les imprimantes réseau.

## Installer

Dans `dist/` :

- `PrimaPorts-Setup-1.0.0.exe` : installeur (raccourcis Bureau et menu Démarrer, désinstallation depuis Windows) ;
- `PrimaPorts-1.0.0-portable.exe` : version sans installation, à lancer directement.

L'exe n'étant pas signé, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur » :
cliquer sur « Informations complémentaires » puis « Exécuter quand même ».

## Utilisation

- Fermer la fenêtre la réduit dans la zone de notification (près de l'horloge) : PrimaPorts continue de
  surveiller et envoie une notification Windows à chaque branchement. « Quitter » est dans le menu de l'icône.
- Menu « … » : exports (CSV, JSON, texte, presse-papiers) et « Lancer au démarrage de Windows ».
- Raccourcis : `Ctrl K` recherche · `F5` réanalyse · `Échap` efface la recherche.
- Journal et réglages : `%APPDATA%\PrimaPorts`.

## Développement

```bash
npm install
npm start
```

```bash
npm run dist
```

| Fichier | Rôle |
| --- | --- |
| `app/main.js` | Fenêtre, icône de notification, notifications, démarrage avec Windows, échanges avec l'interface. |
| `app/core.js` | Moteur : collecte, surveillance temps réel, journal, réglages d'alimentation. |
| `app/preload.js` | Passerelle sécurisée entre l'interface et le moteur. |
| `ui/` | Interface. |
| `collector/collect.ps1` | Interroge Windows (CIM/WMI, PnP) et produit un instantané JSON. |
| `collector/UsbTopology.cs` | Lit les hubs USB : prises physiques, USB‑C, vitesse, puissance déclarée. |
| `collector/worker.ps1` · `watcher.ps1` | PowerShell gardé actif ; écoute des événements de branchement. |
| `build/make-icons.py` | Génère les icônes (`python build/make-icons.py`). |

## Limites connues

- Seules les prises USB sont connues à l'avance ; HDMI, jack ou Ethernet n'apparaissent que lorsqu'ils servent.
- La puissance d'un appareil USB est le maximum qu'il déclare, pas une mesure. Windows n'expose pas la puissance du chargeur : elle se saisit dans le panneau Alimentation.
- Sur secteur, la consommation du PC est estimée à partir des mesures faites sur batterie.
- Avec un adaptateur USB‑C vers HDMI, Windows indique souvent « DisplayPort ».
- L'arrivée ou le départ d'un appareil Bluetooth peut mettre jusqu'à 20 s à s'afficher (60 s fenêtre cachée).
