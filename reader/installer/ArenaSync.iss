; ArenaSync installer.
;
; Build with Inno Setup 6:  https://jrsoftware.org/isdl.php
;   iscc reader\installer\ArenaSync.iss
;
; Produces:  reader\installer\Output\ArenaSyncSetup-1.0.1.exe
;
; Expects dist\ArenaSync.exe to already be built (see SETUP.md step 3a).
;
; The installer .exe inherits the version metadata below, so even before
; code signing Windows properties show "ArenaSync 1.0.1.0 / Phamezan"
; instead of "Unknown" - one of the cheapest SmartScreen / Chrome trust
; signals available for unsigned freeware.

#define ArenaSyncVersion "1.0.1"
#define ArenaSyncPublisher "Phamezan"
#define ArenaSyncURL "https://github.com/Phamezan/arena-tracker"

[Setup]
AppName=ArenaSync
AppVersion={#ArenaSyncVersion}
AppVerName=ArenaSync {#ArenaSyncVersion}
AppPublisher={#ArenaSyncPublisher}
AppPublisherURL={#ArenaSyncURL}
AppSupportURL={#ArenaSyncURL}
AppUpdatesURL={#ArenaSyncURL}
DefaultDirName={autopf}\ArenaSync
DefaultGroupName=ArenaSync
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
OutputDir=Output
OutputBaseFilename=ArenaSyncSetup-{#ArenaSyncVersion}
VersionInfoVersion={#ArenaSyncVersion}.0
VersionInfoCompany={#ArenaSyncPublisher}
VersionInfoProductName=ArenaSync
VersionInfoProductVersion={#ArenaSyncVersion}.0
VersionInfoDescription=ArenaSync {#ArenaSyncVersion} installer
UninstallDisplayIcon={app}\ArenaSync.exe
UninstallDisplayName=ArenaSync {#ArenaSyncVersion}

; Optional code signing - uncomment + set SignTool in [SignTools] below
; once you have an Authenticode certificate. Skipped by default.
; SignTool=mysigntool

[Files]
Source: "..\dist\ArenaSync.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion isreadme

[Icons]
Name: "{group}\ArenaSync"; Filename: "{app}\ArenaSync.exe"
Name: "{group}\Uninstall ArenaSync"; Filename: "{uninstallexe}"
Name: "{group}\What is this"; Filename: "{app}\README.txt"
Name: "{commondesktop}\ArenaSync"; Filename: "{app}\ArenaSync.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\ArenaSync.exe"; Description: "&Launch ArenaSync now"; Flags: nowait postinstall skipifsilent runascurrentuser

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
