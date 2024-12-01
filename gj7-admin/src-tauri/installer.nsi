!include MUI2.nsh
!include LogicLib.nsh
!include FileFunc.nsh
!include nsDialogs.nsh
!include WinMessages.nsh

; Define application information
!define PRODUCT_NAME "nameOftheApp"
!define PRODUCT_VERSION "0.1.0"
!define PRODUCT_PUBLISHER "yourorg"
!define PRODUCT_INSTALLDIR "$PROGRAMFILES\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define CONFIG_DIR "$DOCUMENTS\${PRODUCT_NAME}"
!define APP_DATA_DIR "$APPDATA\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}"
!define SAFE_STORAGE_DIR "$APPDATA\${PRODUCT_PUBLISHER}\${PRODUCT_NAME}\config"
!define BACKUP_DIR "$DOCUMENTS\${PRODUCT_NAME}_Backup"

; Variables
Var Dialog
Var CreateShortcutCheckbox
Var DatabaseNameLabel
Var DatabaseNameText
Var UsernameLabel
Var UsernameText
Var PasswordLabel
Var PasswordText
Var ConfirmPasswordLabel
Var ConfirmPasswordText
Var PasswordShowCheckbox
Var LoginAttempts
Var DbName
Var Password
Var TempPassword
Var TempConfirmPassword
Var TempUsername
Var CopyrightText
Var LogFilePath

Name "${PRODUCT_NAME}"
OutFile "Notes_Setup.exe"
InstallDir "${PRODUCT_INSTALLDIR}"
RequestExecutionLevel admin

; Modern UI settings
!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
Page custom DatabasePage DatabasePageLeave
Page custom CredentialsPage CredentialsPageLeave
Page custom PasswordPage PasswordPageLeave
Page custom ShortcutPage ShortcutPageLeave
Page custom CopyrightPage CopyrightPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Language
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  Call CreateInstallationLog
  StrCpy $LoginAttempts 0
FunctionEnd

Function CreateInstallationLog
    ; Create log directory if it doesn't exist
    CreateDirectory "$DOCUMENTS\${PRODUCT_NAME}"
    
    ; Generate log file path
    StrCpy $LogFilePath "$DOCUMENTS\${PRODUCT_NAME}\installation.log"
    
    ; Open log file for writing
    FileOpen $0 "$LogFilePath" w
    
    ; Write initial log entry
    FileWrite $0 "Installation Log for ${PRODUCT_NAME}$\r$\n"
    FileWrite $9 "Installation Date: $HWNDPARENT$\r$\n"
    FileWrite $0 "Version: ${PRODUCT_VERSION}$\r$\n"
    FileWrite $0 "Install Directory: $INSTDIR$\r$\n"
    FileWrite $0 "--------------------------------$\r$\n"
    
    ; Close log file
    FileClose $0
FunctionEnd

Function DatabasePage
  !insertmacro MUI_HEADER_TEXT "Database Configuration" "Enter database name"
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${NSD_CreateLabel} 0 0 100% 12u "Database Name:"
  Pop $DatabaseNameLabel
  ${NSD_CreateText} 0 13u 100% 12u ""
  Pop $DatabaseNameText
  
  nsDialogs::Show
FunctionEnd

Function DatabasePageLeave
  ${NSD_GetText} $DatabaseNameText $DbName
  ${If} $DbName == ""
    MessageBox MB_ICONSTOP "Please enter a database name"
    Abort
  ${EndIf}
FunctionEnd

Function CredentialsPage
  !insertmacro MUI_HEADER_TEXT "User Credentials" "Enter your username"
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${NSD_CreateLabel} 0 0 100% 12u "Username:"
  Pop $UsernameLabel
  ${NSD_CreateText} 0 13u 100% 12u ""
  Pop $UsernameText
  
  nsDialogs::Show
FunctionEnd

Function CredentialsPageLeave
  ${NSD_GetText} $UsernameText $TempUsername
  ${If} $TempUsername == ""
    MessageBox MB_ICONSTOP "Please enter a username"
    Abort
  ${EndIf}
FunctionEnd

Function PasswordPage
  !insertmacro MUI_HEADER_TEXT "Set Password" "Create your password"
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${NSD_CreateLabel} 0 0 100% 12u "Password:"
  Pop $PasswordLabel
  ${NSD_CreatePassword} 0 13u 100% 12u ""
  Pop $PasswordText
  
  ${NSD_CreateLabel} 0 40u 100% 12u "Confirm Password:"
  Pop $ConfirmPasswordLabel
  ${NSD_CreatePassword} 0 53u 100% 12u ""
  Pop $ConfirmPasswordText
  
  ${NSD_CreateCheckbox} 0 80u 100% 12u "Show passwords"
  Pop $PasswordShowCheckbox
  ${NSD_OnClick} $PasswordShowCheckbox TogglePasswordVisibility
  
  nsDialogs::Show
FunctionEnd

Function TogglePasswordVisibility
  Pop $0
  ${NSD_GetState} $PasswordShowCheckbox $1
  ${If} $1 == ${BST_CHECKED}
    SendMessage $PasswordText ${EM_SETPASSWORDCHAR} 0 0
    SendMessage $ConfirmPasswordText ${EM_SETPASSWORDCHAR} 0 0
  ${Else}
    SendMessage $PasswordText ${EM_SETPASSWORDCHAR} 42 0 ; ASCII for *
    SendMessage $ConfirmPasswordText ${EM_SETPASSWORDCHAR} 42 0
  ${EndIf}
  ShowWindow $PasswordText ${SW_HIDE}
  ShowWindow $PasswordText ${SW_SHOW}
  ShowWindow $ConfirmPasswordText ${SW_HIDE}
  ShowWindow $ConfirmPasswordText ${SW_SHOW}
FunctionEnd

Function PasswordPageLeave
  ${NSD_GetText} $PasswordText $TempPassword
  ${NSD_GetText} $ConfirmPasswordText $TempConfirmPassword
  
  ; Password validation rules
  ${If} $TempPassword == ""
    MessageBox MB_ICONSTOP "Password cannot be empty"
    Abort
  ${EndIf}
  
  ${If} $TempPassword != $TempConfirmPassword
    MessageBox MB_ICONSTOP "Passwords do not match"
    Abort
  ${EndIf}
  
  ; Minimum password length
  StrLen $1 $TempPassword
  ${If} $1 < 8
    MessageBox MB_ICONSTOP "Password must be at least 8 characters long"
    Abort
  ${EndIf}
  
  ; Store validated values
  StrCpy $Password $TempPassword
  
  ; Create config directory and file
  CreateDirectory "$DOCUMENTS\${PRODUCT_NAME}"
  
  ; Create and write config.xml
  FileOpen $9 "$DOCUMENTS\${PRODUCT_NAME}\config.xml" w
  FileWrite $9 '<?xml version="1.0" encoding="UTF-8"?>$\r$\n'
  FileWrite $9 '<config>$\r$\n'
  FileWrite $9 '<database>$\r$\n'
  FileWrite $9 '<name>$DbName</name>$\r$\n'
  FileWrite $9 '</database>$\r$\n'
  FileWrite $9 '<username>$TempUsername</username>$\r$\n'
  FileWrite $9 '<password>$Password</password>$\r$\n'
  FileWrite $9 '</config>'
  FileClose $9
  
  MessageBox MB_OK "config.xml has been created at:$\r$\n$DOCUMENTS\${PRODUCT_NAME}\config.xml"
FunctionEnd

Function ShortcutPage
  !insertmacro MUI_HEADER_TEXT "Create Shortcut" "Would you like to create a desktop shortcut?"
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${NSD_CreateCheckbox} 0 0 100% 12u "Create desktop shortcut"
  Pop $CreateShortcutCheckbox
  ${NSD_Check} $CreateShortcutCheckbox
  
  nsDialogs::Show
FunctionEnd

Function ShortcutPageLeave
  ${NSD_GetState} $CreateShortcutCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\Sample2.exe"
  ${EndIf}
FunctionEnd

Function CopyrightPage
  !insertmacro MUI_HEADER_TEXT "Welcome to ${PRODUCT_NAME}" "Copyright Information"
  nsDialogs::Create 1018
  Pop $Dialog
  
  ; Create a multiline text control for the copyright message
  ${NSD_CreateText} 0 0 100% 80% ""
  Pop $CopyrightText
  
  ; Set text properties
  System::Call "user32::SendMessage(i $CopyrightText, i ${EM_SETREADONLY}, i 1, i 0)"
  SendMessage $CopyrightText ${WM_SETTEXT} 0 "STR:Welcome to ${PRODUCT_NAME}$\r$\n$\r$\nVersion: ${PRODUCT_VERSION}$\r$\n© ${PRODUCT_PUBLISHER} 2024$\r$\n$\r$\nAll rights reserved.$\r$\n$\r$\nBy proceeding with the installation, you agree to the terms and conditions of this software."
  
  ; Style the text
  CreateFont $1 "Segoe UI" "10"
  SendMessage $CopyrightText ${WM_SETFONT} $1 0
  
  nsDialogs::Show
FunctionEnd

Function CopyrightPageLeave
  ; Nothing to validate here, just proceed
FunctionEnd

Function .onInstSuccess
  SetAutoClose false
FunctionEnd

Section "MainSection" SEC01
  ; Open log file in append mode
  FileOpen $9 "$LogFilePath" a
  
  ; Log installation start
  FileWrite $9 "=== Installation Started ===$\r$\n"
  
  ; Set installation output path
  SetOutPath "$INSTDIR"
  File "target\release\Sample2.exe"
  
  ; Log executable installation
  FileWrite $9 "Executable installed: $INSTDIR\Sample2.exe$\r$\n"
  
  ; Create Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\Sample2.exe"
  FileWrite $9 "Start Menu Shortcut created: $SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk$\r$\n"
  
  ; Desktop shortcut creation with detailed logging
  ${NSD_GetState} $CreateShortcutCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    FileWrite $9 "Desktop Shortcut Creation Requested$\r$\n"
    
    IfFileExists "$INSTDIR\Sample2.exe" exe_exists exe_not_found
    
    exe_exists:
      CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\Sample2.exe"
      IfFileExists "$DESKTOP\${PRODUCT_NAME}.lnk" shortcut_success shortcut_fail
      
      shortcut_success:
        FileWrite $9 "Desktop Shortcut Created: $DESKTOP\${PRODUCT_NAME}.lnk$\r$\n"
        Goto continue_section
      
      shortcut_fail:
        FileWrite $9 "ERROR: Desktop Shortcut Creation Failed$\r$\n"
        MessageBox MB_OK "Warning: Could not create desktop shortcut."
        Goto continue_section
      
    exe_not_found:
      FileWrite $9 "ERROR: Executable not found for desktop shortcut$\r$\n"
      MessageBox MB_OK "Error: Executable missing, cannot create shortcut!"
  ${Else}
    FileWrite $9 "Desktop Shortcut Creation Skipped$\r$\n"
  ${EndIf}
  
  continue_section:
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  FileWrite $9 "Uninstaller created: $INSTDIR\uninstall.exe$\r$\n"
  
  ; Write registry entries
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  FileWrite $9 "Registry entries written for ${PRODUCT_NAME}$\r$\n"
  
  ; Close log file
  FileWrite $9 "=== Installation Completed ===$\r$\n"
  FileClose $9
SectionEnd


Section "Uninstall"
  ; Create backup directory with error checking
  CreateDirectory "${BACKUP_DIR}"
  DetailPrint "Backup Directory: ${BACKUP_DIR}"
  
  ; Debug print the paths we're checking
  DetailPrint "Checking database path: ${SAFE_STORAGE_DIR}\*.db"
  DetailPrint "Checking database name path: ${SAFE_STORAGE_DIR}\database_name.txt"
  
  IfFileExists "${SAFE_STORAGE_DIR}\*.db" do_db_backup skip_db_backup
  
  do_db_backup:
    DetailPrint "Found database files at: ${SAFE_STORAGE_DIR}"
    CopyFiles /SILENT "${SAFE_STORAGE_DIR}\*.db" "${BACKUP_DIR}"
    IfErrors db_backup_failed db_backup_success
    
  db_backup_failed:
    DetailPrint "Failed to backup database files from: ${SAFE_STORAGE_DIR}"
    Goto check_database_name
    
  db_backup_success:
    DetailPrint "Database files backed up successfully"
    Goto check_database_name
    
  skip_db_backup:
    DetailPrint "No database files found at: ${SAFE_STORAGE_DIR}"
    
  check_database_name:
    IfFileExists "${SAFE_STORAGE_DIR}\database_name.txt" do_name_backup skip_name_backup
    
  do_name_backup:
    DetailPrint "Found database_name.txt at: ${SAFE_STORAGE_DIR}"
    CopyFiles /SILENT "${SAFE_STORAGE_DIR}\database_name.txt" "${BACKUP_DIR}"
    IfErrors name_backup_failed name_backup_success
    
  name_backup_failed:
    DetailPrint "Failed to backup database_name.txt from: ${SAFE_STORAGE_DIR}"
    Goto continue_uninstall
    
  name_backup_success:
    DetailPrint "Database name file backed up successfully"
    Goto continue_uninstall
    
  skip_name_backup:
    DetailPrint "No database_name.txt found at: ${SAFE_STORAGE_DIR}"
    
  continue_uninstall:
    ; Show backup summary to user
    MessageBox MB_OK "Backup process completed. Files were backed up to:$\r$\n${BACKUP_DIR}"
    
    ; Now proceed with deletion
    Delete "$INSTDIR\Sample2.exe"
    Delete "$INSTDIR\uninstall.exe"
    
    ; Delete shortcuts
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
    
    ; Delete registry entries
    DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
    
    ; Now remove directories
    RMDir "$INSTDIR"
    RMDir "$PROGRAMFILES\${PRODUCT_PUBLISHER}"
    
    ; Remove safe storage directory (after successful backup)
    Delete "${SAFE_STORAGE_DIR}\*.db"
    Delete "${SAFE_STORAGE_DIR}\database_name.txt"
    RMDir /r "${SAFE_STORAGE_DIR}"
    
    MessageBox MB_OK "Uninstallation complete. Your data has been backed up to:$\r$\n${BACKUP_DIR}"
SectionEnd