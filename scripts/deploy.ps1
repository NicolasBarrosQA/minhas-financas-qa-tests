param(
  [string]$CommitMessage = "chore: deploy"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[deploy] $Message" -ForegroundColor Cyan
}

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  throw "Git repository not found at $repoRoot"
}

Set-Location $repoRoot

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
  Write-Step "Pushing branch '$branch' to origin"
  git push -u origin $branch
} else {
  Write-Step "Skipping git push (no remote 'origin' configured)"
}

$netlifyToken = $env:NETLIFY_AUTH_TOKEN
$netlifySiteId = $env:NETLIFY_SITE_ID

if ($netlifyToken -and $netlifySiteId) {
  Write-Step "Running Netlify production deploy"
  Push-Location $appDir
  npm run build
  npx netlify deploy --prod --dir=dist --message $CommitMessage
  Pop-Location
} else {
  Write-Step "Skipping direct Netlify CLI deploy (set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID to enable)"
  Write-Step "If Netlify is connected to your git repo, push already triggers deploy automatically."
}

Write-Step "Deploy pipeline finished"
