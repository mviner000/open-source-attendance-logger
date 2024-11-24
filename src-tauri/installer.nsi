!include MUI2.nsh
!include LogicLib.nsh
!include FileFunc.nsh

; Define application information
!define PRODUCT_NAME "Notes"
!define PRODUCT_VERSION "0.1.0"
!define PRODUCT_PUBLISHER "Melvin_Nogoy"
!define PRODUCT_INSTALLDIR "$PROGRAMFILES\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name "${PRODUCT_NAME}"
OutFile "Notes_Setup.exe"
InstallDir "${PRODUCT_INSTALLDIR}"
RequestExecutionLevel admin

; Variables for credentials
Var Dialog
Var UsernameLabel
Var UsernameText
Var PasswordLabel
Var PasswordText

; Modern UI settings
!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom CredentialsPage CredentialsPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Language
!insertmacro MUI_LANGUAGE "English"

; Custom page for credentials
Function CredentialsPage
    !insertmacro MUI_HEADER_TEXT "User Credentials" "Please enter your username and password"
    
    nsDialogs::Create 1018
    Pop $Dialog
    
    ${If} $Dialog == error
        Abort
    ${EndIf}
    
    ; Username field
    ${NSD_CreateLabel} 0 0 100% 12u "Username:"
    Pop $UsernameLabel
    
    ${NSD_CreateText} 0 13u 100% 12u ""
    Pop $UsernameText
    
    ; Password field
    ${NSD_CreateLabel} 0 40u 100% 12u "Password:"
    Pop $PasswordLabel
    
    ${NSD_CreatePassword} 0 53u 100% 12u ""
    Pop $PasswordText
    
    nsDialogs::Show
FunctionEnd

Function CredentialsPageLeave
    ${NSD_GetText} $UsernameText $0
    ${NSD_GetText} $PasswordText $1
    
    ; Validate fields are not empty
    ${If} $0 == ""
    ${OrIf} $1 == ""
        MessageBox MB_ICONSTOP "Please fill in both username and password"
        Abort
    ${EndIf}
    
    ; Store credentials for later use
    StrCpy $R0 $0  ; Username
    StrCpy $R1 $1  ; Password
FunctionEnd

Section "MainSection" SEC01
    SetOutPath "$INSTDIR"
    
    ; Install main executable
    File "target\release\Sample2.exe"
    
    ; Create credentials file in AppData
    SetOutPath "$LOCALAPPDATA\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
    FileOpen $9 "credentials.txt" w
    FileWrite $9 "$R0,$R1"
    FileClose $9
    
    ; Create start menu shortcut
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\Sample2.exe"
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
    ; Registry entries
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

Section "Uninstall"
    ; Remove application files
    Delete "$INSTDIR\Sample2.exe"
    Delete "$INSTDIR\uninstall.exe"
    
    ; Remove credentials file
    Delete "$LOCALAPPDATA\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}\credentials.txt"
    RMDir "$LOCALAPPDATA\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
    RMDir "$LOCALAPPDATA\${PRODUCT_PUBLISHER}"
    
    ; Remove start menu items
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
    
    ; Remove registry keys
    DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
    
    ; Remove install directory
    RMDir "$INSTDIR"
    RMDir "$PROGRAMFILES\${PRODUCT_PUBLISHER}"
SectionEnd