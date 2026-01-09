# Step 3: Create Monorepo and Merge
Write-Host "Creating Monorepo..."

# 1. Initialize root git
git init

# 2. Merge Backend
Write-Host "Merging Backend..."
git remote add -f origin_backend ./backend
git merge origin_backend/main --allow-unrelated-histories

# 3. Merge Frontend
Write-Host "Merging Frontend..."
git remote add -f origin_focuss ./Focuss
git merge origin_focuss/main --allow-unrelated-histories

# 4. Cleanup
Write-Host "Cleaning up..."
git remote remove origin_backend
git remote remove origin_focuss

# Remove old .git folders to avoid submodules
Remove-Item -Path "backend/.git" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "Focuss/.git" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Monorepo Setup Complete! Verify with 'git log'."
