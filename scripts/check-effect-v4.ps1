param(
  [string]$SrcDir = "src"
)

if (-not (Test-Path -LiteralPath $SrcDir -PathType Container)) {
  Write-Host "Directory $SrcDir does not exist. Skipping Effect v4 check."
  exit 0
}

Write-Host "Running Effect v4 Beta syntax check on $SrcDir..."

$bannedPattern = "Context\.Tag\(|Context\.GenericTag\(|Effect\.Tag\(|Effect\.Service\(|Runtime\.runFork|Effect\.runtime<|Effect\.catchAll|Effect\.catchSome|Effect\.fork\(|Effect\.forkDaemon\("
$files = @(Get-ChildItem -LiteralPath $SrcDir -Recurse -File)
$matches = @()

if ($files.Count -gt 0) {
  $matches = @($files | Select-String -Pattern $bannedPattern)
}

if ($matches.Count -gt 0) {
  $matches | ForEach-Object {
    Write-Output ("{0}:{1}:{2}" -f $_.Path, $_.LineNumber, $_.Line.TrimEnd())
  }

  Write-Host ""
  Write-Host "ERROR: Found Effect v3 banned patterns!"
  Write-Host "Please refer to docs/effect/v4-banned-patterns.md and docs/effect/v4-playbook.md to fix these issues."
  exit 1
}

Write-Host "Effect v4 syntax check passed!"
exit 0
