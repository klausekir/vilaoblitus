$Branch = "main"

git fetch origin

git add -A
git commit -m "Force sync local -> remote main" 2>$null

git push --force origin $Branch
