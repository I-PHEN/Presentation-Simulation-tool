param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$powerPoint = $null
$presentation = $null
$conversionStage = 'validating input'

try {
  if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) {
    throw "Input presentation was not found: $InputPath"
  }

  $outputDirectory = Split-Path -Parent $OutputPath
  if ($outputDirectory) {
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  }

  $conversionStage = 'starting PowerPoint'
  $powerPoint = New-Object -ComObject PowerPoint.Application

  $conversionStage = 'opening presentation'
  $presentation = $powerPoint.Presentations.Open($InputPath, $true, $false, $false)

  $conversionStage = 'saving PDF'
  $presentation.SaveAs($OutputPath, 32)

  if (-not (Test-Path -LiteralPath $OutputPath -PathType Leaf)) {
    throw "PowerPoint did not create a PDF at: $OutputPath"
  }
} catch {
  if ($conversionStage -eq 'opening presentation') {
    [Console]::Error.WriteLine("INVALID_DECK: $($_.Exception.Message)")
  } else {
    [Console]::Error.WriteLine("PowerPoint conversion failed: $($_.Exception.Message)")
  }
  exit 1
} finally {
  if ($presentation) {
    try { $presentation.Close() } catch { }
    try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) } catch { }
  }

  if ($powerPoint) {
    try { $powerPoint.Quit() } catch { }
    try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) } catch { }
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
