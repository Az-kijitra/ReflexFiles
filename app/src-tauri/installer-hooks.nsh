!macro NSIS_HOOK_POSTINSTALL
  StrCpy $0 "en"

  ; LANG_JAPANESE = 1041
  StrCmp $LANGUAGE 1041 0 +2
    StrCpy $0 "ja"

  FileOpen $1 "$INSTDIR\resources\installer_language.txt" w
  FileWrite $1 "$0"
  FileClose $1
!macroend
