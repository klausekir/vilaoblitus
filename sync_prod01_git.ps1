$Branch = "prod01"
$CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()

git fetch origin

if (-not (git show-ref --verify --quiet ("refs/heads/$Branch"))) {
    Write-Host "Branch '$Branch' não existe localmente. Criando a partir da branch atual ($CurrentBranch)."
    git checkout -b $Branch
} else {
    Write-Host "Trocando para a branch '$Branch'."
    git checkout $Branch
    git pull --ff-only origin $Branch 2>$null
}

git add -A
git commit -m "Sync local -> remote $Branch" 2>$null
git push origin $Branch

if ($CurrentBranch -ne $Branch) {
    Write-Host "Voltando para a branch original '$CurrentBranch'."
    git checkout $CurrentBranch
}
