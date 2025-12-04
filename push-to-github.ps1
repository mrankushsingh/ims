# Script to push code to GitHub
param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUrl
)

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan

# Add remote
Write-Host "Adding remote origin..." -ForegroundColor Yellow
git remote add origin $GitHubUrl

# Check if remote already exists
if ($LASTEXITCODE -ne 0) {
    Write-Host "Remote might already exist. Updating..." -ForegroundColor Yellow
    git remote set-url origin $GitHubUrl
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Your code is now on GitHub at: $GitHubUrl" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Push failed. Please check:" -ForegroundColor Red
    Write-Host "  1. GitHub URL is correct" -ForegroundColor White
    Write-Host "  2. You're authenticated with GitHub" -ForegroundColor White
    Write-Host "  3. Repository exists on GitHub" -ForegroundColor White
}

