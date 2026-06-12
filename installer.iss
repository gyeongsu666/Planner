[Setup]
AppName=플래너
AppVersion=1.0
AppPublisher=김경수
DefaultDirName={autopf}\플래너
DefaultGroupName=플래너
OutputBaseFilename=플래너_설치
OutputDir=installer_output
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Tasks]
Name: "desktopicon"; Description: "바탕화면에 바로가기 만들기"; GroupDescription: "추가 작업:";

[Files]
Source: "dist\planner\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "dist\widget\widget.exe"; DestDir: "{app}"; Flags: ignoreversion
; WebView2 부트스트래퍼 — 설치 후 자동 삭제
Source: "MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{group}\플래너";        Filename: "{app}\planner.exe"
Name: "{commondesktop}\플래너"; Filename: "{app}\planner.exe"; Tasks: desktopicon

[Run]
; WebView2 미설치 시에만 설치 (Check 함수로 판별)
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; \
    Parameters: "/silent /install"; \
    StatusMsg: "Microsoft Edge WebView2 런타임 설치 중..."; \
    Check: WebView2NotInstalled; \
    Flags: waituntilterminated
Filename: "{app}\planner.exe"; Description: "플래너 실행하기"; Flags: nowait postinstall skipifsilent

[Code]
{ WebView2 설치 여부 확인 (시스템 전체 또는 현재 사용자) }
function IsWebView2Installed: Boolean;
var
  Version: String;
begin
  Result :=
    RegQueryStringValue(HKLM,
      'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', Version) or
    RegQueryStringValue(HKCU,
      'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', Version);
end;

function WebView2NotInstalled: Boolean;
begin
  Result := not IsWebView2Installed;
end;
