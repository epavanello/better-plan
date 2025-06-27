# Release Management and Docker Publishing

This document explains how the automated release system works and how to publish versioned Docker images to GitHub Container Registry (ghcr.io).

## 🏗️ System Architecture

The project uses:
- **GitHub Container Registry (ghcr.io)** to host Docker images
- **GitHub Actions** for CI/CD automation
- **Semantic Versioning (SemVer)** for versioning
- **Conventional Commits** to automatically determine release type

## 📋 How It Works

### 1. Automatic Versioning

The system analyzes commit messages to determine the version bump type:

- `feat:` → **Minor** version (0.1.0 → 0.2.0)
- `fix:` → **Patch** version (0.1.0 → 0.1.1)  
- `feat!:` or `BREAKING CHANGE` → **Major** version (0.1.0 → 1.0.0)

### 2. Automatic Docker Tags

For each release, these tags are automatically created:

```bash
# For a release v1.2.3
ghcr.io/username/better-plan:1.2.3     # Exact version tag
ghcr.io/username/better-plan:1.2       # Major.minor tag
ghcr.io/username/better-plan:1         # Major tag
ghcr.io/username/better-plan:latest    # Latest tag (main branch only)
```

### 3. Branch Strategy

- **`main`** → Production (tags `latest` and release versions)
- **`develop`** → Development (tag `develop`)  
- **Pull Requests** → Testing (tag `pr-123`)

## 🚀 How to Create a Release

### Method 1: Automatic (Recommended)

1. **Make commits with Conventional Commits:**
   ```bash
   git commit -m "feat: add new scheduling feature"
   git commit -m "fix: resolve authentication bug"
   git commit -m "feat!: redesign API (BREAKING CHANGE)"
   ```

2. **Push to main branch:**
   ```bash
   git push origin main
   ```

3. **The system automatically:**
   - Analyzes commits
   - Determines version bump type
   - Creates a new release
   - Publishes Docker image

### Method 2: Manual

1. **Via GitHub Actions UI:**
   - Go to Actions → Release
   - Click "Run workflow"
   - Choose version bump type (patch/minor/major)

2. **Via NPM scripts:**
   ```bash
   # For patch release (0.1.0 → 0.1.1)
   pnpm run release:patch
   
   # For minor release (0.1.0 → 0.2.0)  
   pnpm run release:minor
   
   # For major release (0.1.0 → 1.0.0)
   pnpm run release:major
   ```

## 🐋 Docker Image Deployment

### Automatic Deploy (Recommended)

The image is automatically published to ghcr.io on every push/release.

### Manual Deploy

```bash
# Manual build and push
export GITHUB_REPOSITORY="username/better-plan"
pnpm run docker:push
```

### Using the Image

```bash
# Latest version
docker pull ghcr.io/username/better-plan:latest

# Specific version  
docker pull ghcr.io/username/better-plan:1.2.3

# Run container
docker run -p 3000:3000 ghcr.io/username/better-plan:latest
```

## 📊 Workflow Details

### Docker Workflow (`.github/workflows/docker.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main`
- Published releases
- Manual trigger

**Actions:**
- Multi-platform build (amd64, arm64)
- Push to ghcr.io with appropriate tags
- Cache optimization
- Security attestation

### Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Push to `main` (automatic)
- Manual trigger with version type

**Actions:**
- Version bump in package.json
- Changelog generation
- GitHub release creation
- Trigger Docker workflow

## 🔧 Initial Setup

### 1. Enable GitHub Packages

1. Go to Settings → Actions → General
2. Enable "Read and write permissions" for GITHUB_TOKEN
3. Save changes

### 2. Configure Repository Secrets (Optional)

For advanced configurations, you might need:

```bash
# GitHub Personal Access Token with packages:write permissions
GHCR_TOKEN=ghp_xxxxxxxxxxxx
```

### 3. First Release

```bash
# Make sure you're on main branch
git checkout main

# Create first tag manually
git tag v0.1.0
git push origin v0.1.0

# Or use the script
pnpm run release:patch
```

## 📝 Best Practices

### Conventional Commits Format

```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Examples:**
```bash
feat: add user authentication
fix: resolve database connection issue  
docs: update API documentation
feat!: remove deprecated endpoints
feat(api): add new user endpoints
fix(ui): resolve button styling issue
```

### Git Workflow

1. **Feature Development:**
   ```bash
   git checkout -b feature/new-feature
   # develop the feature
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   # create PR to main
   ```

2. **Hotfix:**
   ```bash
   git checkout -b hotfix/critical-bug  
   # fix the bug
   git commit -m "fix: resolve critical security issue"
   git push origin hotfix/critical-bug
   # create PR to main
   ```

## 🔍 Monitoring and Debug

### Verify Images

```bash
# List available images
docker search ghcr.io/username/better-plan

# Inspect specific image
docker inspect ghcr.io/username/better-plan:latest
```

### Debug GitHub Actions

1. Go to Actions tab in repository
2. Select the failed workflow
3. Expand steps to see detailed logs
4. Check permissions and secrets

### Image Logs

```bash
# Run container with logs
docker run --rm ghcr.io/username/better-plan:latest

# Check logs of running container
docker logs <container-id>
```

## ⚠️ Troubleshooting

### Issue: Permission denied for ghcr.io

**Solution:**
```bash
# Manual login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Issue: Existing tags

**Solution:**
```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag  
git push origin :refs/tags/v1.0.0

# Recreate tag
git tag v1.0.0
git push origin v1.0.0
```

### Issue: Workflow not triggering

**Common causes:**
- Branch protection rules
- Insufficient GITHUB_TOKEN permissions
- Syntax error in workflow files

## 📚 Useful Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Multi-platform builds](https://docs.docker.com/build/building/multi-platform/) 