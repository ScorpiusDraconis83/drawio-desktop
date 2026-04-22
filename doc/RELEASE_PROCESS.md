# draw.io Desktop Release Process

**Document ID:** REL-PROC-DESKTOP-001  
**Version:** 1.0  
**Last Updated:** 2026-01-02
**Owner:** Engineering Team

---

## 1. Purpose

This document defines the release process for draw.io Desktop. Automated controls via GitHub Actions handle repeatable tasks, while manual steps focus on verification and approval.

**Repository:** https://github.com/jgraph/drawio-desktop  
**Submodule:** drawio (core editor)  
**CI/CD:** GitHub Actions

---

## 2. Controlled Tooling

Tooling versions are pinned in the GitHub Actions workflows to ensure reproducible builds.

| Tool | Version | Controlled In |
|------|---------|---------------|
| Node.js | 24.x (LTS) | `.github/workflows/*.yml` |
| npm | (bundled with Node) | — |

> **Note:** npm is bundled with Node.js, ensuring consistent versions across environments.

When updating tooling versions:
1. Update the version in all workflow files
2. Test locally with matching versions
3. Document the change in the PR

---

## 3. Roles

| Role | Responsibility |
|------|----------------|
| **Release Lead** | Triggers workflow, verifies output, approves release |
| **Reviewer** | Reviews changes, provides approval before publish |

> **Small Team Note:** Release Lead and Reviewer should be different people when possible. For solo releases, rely on automated checks and document the reason.

---

## 4. Release Procedure

### 4.1 Automated Preparation (GitHub Actions)

The `prepare-release` workflow automates:
- Updating drawio submodule to target ref (with recursive submodule init)
- Updating version in package.json
- Running `npm audit` and failing on critical/high vulnerabilities
- Running `npm outdated` for review
- Committing changes and creating version tag
- Uploading audit evidence as artifacts

**To trigger:**

1. Go to Actions → "Prepare Release"
2. Click "Run workflow"
3. Enter:
   - **version:** The release version (e.g., `29.0.4`)
   - **drawio_ref:** (Optional) Specific tag/commit for the public `drawio` submodule. Leave empty to keep the current submodule pin — CI builds source the editor from `drawio-dev`'s release branch, so the public submodule only needs to track what out-of-tree builders should see.
   - **dry_run:** Check to validate without committing

**What happens:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Workflow: prepare-release                                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Validate version format (X.Y.Z)                              │
│  2. Checkout with submodules (recursive)                         │
│  3. Setup Node.js 24.x                                          │
│  4. Update drawio submodule → target ref                         │
│     └── Update nested submodules (recursive)                     │
│  5. Update package.json version                                  │
│  6. npm ci                                                       │
│  7. npm audit → FAIL if critical/high vulns                      │
│  8. npm outdated → report only                                  │
│  9. Upload evidence artifacts                                    │
│ 10. Commit + push                                                │
│ 11. Create + push tag v{version}                                 │
│ 12. Build workflows trigger automatically                        │
└─────────────────────────────────────────────────────────────────┘
```

**Evidence produced:**
- Workflow run log (retained by GitHub)
- `release-evidence-v{VERSION}` artifact containing:
  - `audit-results.json`
  - `audit-report.txt`
  - `outdated-report.txt`
- Job summary with version details and audit results

### 4.2 Pre-Release Verification

Before triggering the workflow:

| ✓ | Item |
|---|------|
| ☐ | Release scope documented (what's included) |
| ☐ | All feature changes merged to dev branch |
| ☐ | Target drawio ref exists and is tested |

### 4.3 Monitor Build

After the prepare-release workflow completes:

1. Verify the build workflows triggered automatically
2. Monitor build status in Actions tab
3. All platform builds must succeed before proceeding

**Evidence:** Link to successful build run: `_______________`

### 4.4 Publish Release

After all build workflows complete successfully:

1. Go to GitHub Releases - a draft release will have been created with all artifacts
2. Verify all platform builds are present (Windows builds are automatically signed via CI using `CSC_LINK` secret)
3. Add release notes (Section 8)
4. **Obtain Reviewer approval** (Section 5)
5. Click "Publish release"

---

## 5. Approval

Before publishing, the Reviewer verifies:

| ✓ | Check |
|---|-------|
| ☐ | Workflow completed successfully |
| ☐ | npm audit shows no critical/high vulnerabilities |
| ☐ | Build workflows passed for all platforms |
| ☐ | Test cases passed (Section 6) |

| | Name | Date |
|---|------|------|
| **Release Lead** | | |
| **Reviewer** | | |

> **Solo Release:** Document reason, ensure all automated checks pass, perform extended testing.

---

## 6. Test Cases

Run against the built application before publishing.

### Critical (Must Pass)

| ID | Test | Expected | Pass |
|----|------|----------|------|
| T01 | Launch application | Main window displays | ☐ |
| T02 | Create new diagram | Blank canvas opens | ☐ |
| T03 | Add shapes | Shapes render, move, resize | ☐ |
| T04 | Save file | Saves without error | ☐ |
| T05 | Open file | Displays correctly | ☐ |
| T06 | Help > About | Shows correct version | ☐ |

### Standard

| ID | Test | Expected | Pass |
|----|------|----------|------|
| T07 | Export PNG/PDF/SVG | Valid output | ☐ |
| T08 | Undo/Redo | Actions reverse | ☐ |

### Security

| ID | Check | Method | Pass |
|----|-------|--------|------|
| S01 | No external scripts | DevTools Network tab | ☐ |
| S02 | No data exfiltration | Monitor during save | ☐ |

**Tested by:** _______________  **Date:** _______________

---

## 7. Rollback

### When to Rollback

- Critical functionality broken
- Security vulnerability discovered
- Data loss or corruption

### Steps

1. Convert GitHub release to draft
2. Ensure previous version is "Latest"
3. Notify team
4. Document incident below

### Incident Report

**Version:** _______________  
**Issue:** _______________________________________________  
**Root Cause:** _______________________________________________  
**Corrective Action:** _______________________________________________  
**Completed by:** _______________  **Date:** _______________

---

## 8. Release Notes Template

```markdown
## v[VERSION] - [DATE]

### Changes
- [Change 1]
- [Change 2]

### Fixes
- [Fix 1]

### Security
- Dependencies updated

### Known Issues
- [If any]
```

---

## 9. Evidence Retention

Evidence is automatically retained:

| Evidence | Location | Retention |
|----------|----------|-----------|
| Workflow logs | GitHub Actions | 90 days (GitHub default) |
| Audit artifacts | Actions → Artifacts | 365 days (configured) |
| Release assets | GitHub Releases | Permanent |
| Git tags/commits | Repository | Permanent |

For audits requiring longer retention, download artifacts to secure storage.

---

## 10. Handling Failures

### npm audit fails (critical/high vulnerabilities)

1. Review `audit-report.txt` in workflow artifacts
2. Options:
   - Run `npm audit fix` locally, commit, re-run workflow
   - If unfixable, assess risk and document exception
   - Delay release until fix available

### Build fails

1. Check workflow logs for error
2. Fix issue in codebase
3. Delete the tag: `git push --delete origin v{VERSION}`
4. Re-run prepare-release workflow

### Submodule ref not found

1. Verify the drawio tag/ref exists in the public drawio repository
2. Use `drawio_ref` input to specify the correct ref — or leave it empty to keep the current submodule pin (the CI build workflows source the editor from `drawio-dev`, so they are unaffected by a lagging public pin)

---

## Revision History

| Version | Date       | Author      | Changes |
|---------|------------|-------------|---------|
| 1.0     | 2026.01.02 | D Benson    | Initial release |
