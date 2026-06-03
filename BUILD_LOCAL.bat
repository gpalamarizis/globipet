@echo off
setlocal
title GlobiPet Build

set PROJECT=C:\Users\gpala\Downloads\GlobiPet-Mobile\globipet-mobile-standalone
set SDK=C:\Users\gpala\AppData\Local\Android\Sdk
set JAVA=%PROGRAMFILES%\Android\Android Studio\jbr

set JAVA_HOME=%JAVA%
set ANDROID_HOME=%SDK%
set PATH=%JAVA%\bin;%SDK%\platform-tools;%PATH%

echo === GlobiPet APK Builder ===
echo.

:: Accept licenses
if not exist "%SDK%\licenses" mkdir "%SDK%\licenses"
(echo. & echo 8933bad161af4178b1185d1a37fbf41ea5269c55 & echo d56f5187479451eabf01fb78af6dfcb131a6481e & echo 24333f8a63b6825ea9c5514f83c2829b004d1fee) > "%SDK%\licenses\android-sdk-license"
(echo. & echo 84831b9409646a918e30573bab4c9c91346d8abd) > "%SDK%\licenses\android-sdk-preview-license"
(echo. & echo 859f317696f67ef3d7f30a50a5560e7834b43903) > "%SDK%\licenses\android-sdk-arm-dbt-license"
(echo. & echo d975f751698a77b662f1254ddbeed3901e976f5a) > "%SDK%\licenses\intel-android-extra-license"
echo [1] Licenses accepted

:: local.properties
echo sdk.dir=%SDK:\=\\%> "%PROJECT%\android\local.properties"
echo [2] local.properties done

:: Fix kotlinVersion
powershell -Command "(Get-Content '%PROJECT%\android\gradle.properties') -replace 'kotlinVersion=.*', '' | Set-Content '%PROJECT%\android\gradle.properties'; Add-Content '%PROJECT%\android\gradle.properties' 'kotlinVersion=2.1.0'"
echo [3] Kotlin version fixed

:: Fix enableBundleCompression
powershell -Command "(Get-Content '%PROJECT%\android\app\build.gradle') | Where-Object {$_ -notmatch 'enableBundleCompression'} | Set-Content '%PROJECT%\android\app\build.gradle'"
echo [4] build.gradle fixed

:: Build
echo [5] Building APK...
cd /d "%PROJECT%\android"
call .\gradlew assembleDebug --no-daemon 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo === SUCCESS! ===
    echo APK: %PROJECT%\android\app\build\outputs\apk\debug\app-debug.apk
    explorer "%PROJECT%\android\app\build\outputs\apk\debug"
) else (
    echo === FAILED ===
)
pause
