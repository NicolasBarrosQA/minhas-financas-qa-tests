param(
  [string]$CommitMessage = "chore: deploy",
  [string]$TargetBranch = "main"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[deploy] $Message" -ForegroundColor Cyan
}

function Load-DotEnvFile([string]$FilePath) {
  if (-not (Test-Path $FilePath)) {
    return
  }

  Get-Content -Path $FilePath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")

    if ($key) {
      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  throw "Git repository not found at $repoRoot"
}

Set-Location $repoRoot
Load-DotEnvFile (Join-Path $repoRoot ".env.deploy.local")

$appDir = Join-Path $repoRoot "azainterface-main"
if (-not (Test-Path $appDir)) {
  throw "App directory not found: $appDir"
}

Write-Step "Running quality checks (ci)"
Push-Location $appDir
npm run ci
Pop-Location

$projectRef = "zbmopudrjqexgrzitwrp"
$supabaseToken = $env:SUPABASE_ACCESS_TOKEN
$supabaseDbPassword = $env:SUPABASE_DB_PASSWORD

if ($supabaseToken -and $supabaseDbPassword) {
  Write-Step "Deploying Supabase migrations"
  Push-Location $appDir
  npx supabase db push -p $supabaseDbPassword --yes --include-all

  Write-Step "Deploying Supabase functions"
  npx supabase functions deploy parse-transaction --project-ref $projectRef
  npx supabase functions deploy process-recurrences --project-ref $projectRef
  Pop-Location
} else {
  Write-Step "Skipping Supabase deploy (set SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD to enable)"
}

Write-Step "Preparing git commit"
git add -A

$hasChanges = (git status --porcelain)
if (-not $hasChanges) {
  Write-Step "No git changes to commit"
} else {
  git commit -m $CommitMessage
}

$branch = git branch --show-current
$hasOrigin = git remote | Where-Object { $_ -eq "origin" }

if ($hasOrigin) {
  if ($branch -eq $TargetBranch) {
    Write-Step "Pushing branch '$branch' to origin"
    git push -u origin $branch
  } else {
    Write-Step "Pushing current branch '$branch' to origin/$TargetBranch"
    git push origin "$branch`:$TargetBranch"
  }
} else {
  Write-Step "Skipping git push (no remote 'origin' configured)"
}

$netlifyToken = $env:NETLIFY_AUTH_TOKEN
$netlifySiteId = $env:NETLIFY_SITE_ID

if ($netlifySiteId) {
  Write-Step "Running Netlify production deploy"
  Push-Location $appDir
  npm run build
  if ($netlifyToken) {
    npx netlify deploy --prod --dir=dist --site $netlifySiteId --auth $netlifyToken --message $CommitMessage
  } else {
    npx netlify deploy --prod --dir=dist --site $netlifySiteId --message $CommitMessage
  }
  Pop-Location
} else {
  Write-Step "Skipping direct Netlify CLI deploy (set NETLIFY_SITE_ID to enable)"
  Write-Step "If Netlify is connected to your git repo, push already triggers deploy automatically."
}

Write-Step "Deploy pipeline finished"
