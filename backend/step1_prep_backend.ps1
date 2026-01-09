# Step 1: Prepare Backend Repository
Write-Host "Preparing Backend Repository..."

# 1. Commit the merge conflict resolution
git add .
git commit -m "Resolved merge conflicts"

# 2. Create the subdirectory
New-Item -ItemType Directory -Force -Name backend

# 3. Move all files into subdirectory (excluding .git and the new folder itself)
Get-ChildItem -Exclude ".git","backend" | Move-Item -Destination "backend"

# 4. Commit the move
git add .
git commit -m "Moved backend files to subdir for monorepo merge"

Write-Host "Backend preparation complete!"
