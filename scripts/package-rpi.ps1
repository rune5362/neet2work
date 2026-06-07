$ErrorActionPreference = "Stop"

$ReleaseDir = "release-rpi"
$ZipFile = "neet2work-rpi-release.zip"

pnpm run build

Remove-Item -Recurse -Force $ReleaseDir -ErrorAction SilentlyContinue
Remove-Item -Force $ZipFile -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Force "$ReleaseDir/apps/backend" | Out-Null
New-Item -ItemType Directory -Force "$ReleaseDir/apps/frontend" | Out-Null

Copy-Item "package.json" "$ReleaseDir/"
Copy-Item "pnpm-lock.yaml" "$ReleaseDir/"
Copy-Item "pnpm-workspace.yaml" "$ReleaseDir/"

Copy-Item "apps/backend/package.json" "$ReleaseDir/apps/backend/"
Copy-Item "apps/backend/dist" "$ReleaseDir/apps/backend/dist" -Recurse
Copy-Item "apps/backend/prisma" "$ReleaseDir/apps/backend/prisma" -Recurse

Copy-Item "apps/frontend/package.json" "$ReleaseDir/apps/frontend/"
Copy-Item "apps/frontend/dist" "$ReleaseDir/apps/frontend/dist" -Recurse

Compress-Archive -Path "$ReleaseDir/*" -DestinationPath $ZipFile -Force

Write-Host "Created $ZipFile"