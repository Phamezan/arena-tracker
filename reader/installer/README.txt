ArenaSync 1.0.1
===============

What this is
------------
A tiny one-time tool that reads your local League of Legends client's Arena
God challenge progress (every champion you have ever won an Arena game with)
and syncs it to the shared friend dashboard.

Source code is public and readable here:
    https://github.com/Phamezan/arena-tracker

You can read exactly what it does in reader/lcu_export.py before running it.


Before you run it
-----------------
1. Open the League of Legends client.
2. Log in to the account whose Arena history you want to sync.
3. Make sure the client is fully loaded (the home screen is visible).

Then double-click ArenaSync.exe (or the desktop shortcut). A black console
window opens, runs for a few seconds, prints the champions it found, and
closes itself. Done. You only ever need to run this once.


What it does NOT do
-------------------
- Does not touch your Riot password. It reads the same local token your own
  League client already uses on your machine; nothing is sent to Riot.
- Does not modify the game client or any files.
- Does not run in the background. It exits when it is done.
- Does not phone home beyond one POST to the friend dashboard's sync worker,
  containing only champion names + your game name. You can read the exact
  payload in the source linked above.


Uninstall
---------
Use "Uninstall ArenaSync" in the Start Menu, or
Settings > Apps > ArenaSync > Uninstall.


Problems
--------
- "Unknown publisher" / SmartScreen warning: ArenaSync is not code-signed
  (signing certs cost money). The warning is expected. Click
  "More info" -> "Run anyway". The installer is reproducible from the public
  source above; you can also build it yourself to verify.
- "Windows protected your PC" appears for any unsigned exe the first time.
  Same workaround.
- Nothing happens after double-click: check that the League client is open
  and you are logged in, then try again.
- It printed 0 champions: your account may genuinely have zero Arena wins,
  or the Arena God challenge ID changed - ping @Phamezan.


Checksum
--------
The SHA256 of the installer .exe is published alongside the download on the
GitHub release page. Verify with PowerShell:

    Get-FileHash .\ArenaSyncSetup-1.0.1.exe -Algorithm SHA256
