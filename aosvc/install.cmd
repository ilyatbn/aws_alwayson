@echo off
rem run this script as admin

if not exist aosvc.exe (
    echo Build the example before installing by running "go build"
    goto :exit
)

sc create AwsAlwaysOnService binpath= "%CD%\aosvc.exe" start= auto DisplayName= "AWS AlwasyOn client service"
sc description AwsAlwaysOnService "AWS AlwasyOn extension helper service"
net start AwsAlwaysOnService

:exit