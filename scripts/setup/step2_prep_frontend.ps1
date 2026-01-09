# Step 2: Prepare Frontend Repository
Write-Host "Preparing Frontend Repository..."

# 1. Create the subdirectory
New-Item -ItemType Directory -Force -Name Focuss

# 2. Move all files into subdirectory (excluding .git and the new folder itself)
Get-ChildItem -Exclude ".git","Focuss" | Move-Item -Destination "Focuss"

# 3. Commit the move
git add .
git commit -m "Moved frontend files to subdir for monorepo merge"

Write-Host "Frontend preparation complete!"
