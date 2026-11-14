$ErrorActionPreference = "Stop"

$orchestratorPath = "C:\Users\NOUR\Desktop\Free AI Development Hub\Projects\Free-AI-Multi-Agent-Orchestrator\OpenCodeOrchestrator.psm1"
Import-Module $orchestratorPath -Force

$auditPrompt = @"
You are the Independent Security and Architecture Reviewer for the KYRAXO AI COUNCIL.

The Human System Owner has authorized Stage S5: Real-World Development Pilot on the production website repository:
C:\Users\NOUR\Desktop\Free AI Development Hub\Projects\GLOBAL-ARCADE

Antigravity has implemented Stage S5: visual redesign, branding alignment to KYRAXO, catalog integrity (indexing 2048 Classic, removing ghost duplicate entries), admin and discovery inbox security hardening, and technical SEO structured data.
You must conduct a comprehensive, independent security, architecture, and reliability audit of the implementation.

You are running in BUILD mode, so you are authorized to inspect code, run tests, and write your final audit report to disk.

Key Areas to Inspect:
1. Brand Identity & Domain Alignment:
   - Inspect index.html, src/i18n/translations.ts, src/utils/seo.ts, src/components/common/Header.tsx, src/components/common/Footer.tsx.
   - Verify that public-facing branding has been updated from 'Global Arcade' / 'جلوبال أركيد' to 'KYRAXO' / 'كايراكسو'.
   - Verify that canonical URLs, robots.txt, and sitemap.xml point to https://kyraxo.com.

2. Administrative Surface & Route Security:
   - Inspect src/components/common/Header.tsx: verify /inbox and /admin are REMOVED from the main public header navigation.
   - Inspect src/pages/DiscoveryInboxPage.tsx: verify authentication check (adminService.getSession()) renders AdminLoginModal when unauthenticated.
   - Inspect server/api-router.js and server/auth.js: verify server-side authorization middleware protects administrative endpoints (/api/admin/*, /api/automation/*, /api/jobs/*, /api/candidates/*, /api/inbox/*) with Argon2id session authentication and CSRF headers.

3. Game Catalog Integrity:
   - Inspect src/data/games.json: verify all 4 ghost duplicate games (dungeon-crawler-quest, candy-bubble-pop, galaxy-battle-royale, penalty-kick-master) have been removed.
   - Inspect pilot-2048 in public/games/pilot-2048 and src/data/games.json: verify MIT license, Intel Clear Sans Apache-2.0 font license, 0 security findings, dedicated SVG artwork (/thumbnails/pilot-2048.svg), and bilingual metadata.
   - Verify exactly 9 authentic, unique published games in games.json matching physical directories in public/games/.

4. Technical SEO & Schema.org Structured Data:
   - Inspect src/components/common/Breadcrumb.tsx: verify Schema.org BreadcrumbList JSON-LD with absolute URLs.
   - Inspect src/pages/CategoryPage.tsx: verify Schema.org CollectionPage JSON-LD.
   - Inspect src/pages/GameDetailPage.tsx: verify Schema.org VideoGame JSON-LD.
   - Inspect public/sitemap.xml and public/robots.txt: verify 28 valid URLs under https://kyraxo.com.

5. Build, Regression Tests & Security Audit:
   - Run npm run build (tsc && vite build) to verify 0 compile or bundling errors.
   - Run npm test (node --test tests/*.test.js) to verify all 276 tests pass 100% green.
   - Run npm run audit (node scripts/security-audit.js) to verify all 9 games pass security audit.

Issue your final independent audit report with findings and a definitive verdict:
- PASS, PASS WITH CONDITIONS, or FAIL.

Deliverable:
Save your final independent audit report to:
OPENCODE_PHASE2_S5_FINAL_AUDIT.md

Do not start Stage S6.
"@

Write-Host "Dispatching Stage S5 Final Audit Prompt to OpenCode in BUILD mode..."
$startTime = Get-Date

$response = Invoke-OpenCodeProcess `
    -Prompt $auditPrompt `
    -Model "opencode/glm-5.3-flash-free" `
    -Agent "build" `
    -Title "[STAGE S5] Final Independent Production Website Audit" `
    -WorkingDirectory "C:\Users\NOUR\Desktop\Free AI Development Hub\Projects\GLOBAL-ARCADE" `
    -TimeoutSeconds 600

$duration = ((Get-Date) - $startTime).TotalSeconds

Write-Host "Stage S5 Audit completed in $([math]::Round($duration, 1))s."
Write-Host "Success: $($response.Success)"
Write-Host "Session ID: $($response.SessionId)"
Write-Host "Exit Code: $($response.ExitCode)"

if (-not $response.Success -and [string]::IsNullOrEmpty($response.TextResponse)) {
    throw "OpenCode S5 audit execution failed: $($response.ErrorMessage) | Stderr: $($response.RawStderr)"
}

$planPath = "C:\Users\NOUR\.opencode\plan\OPENCODE_PHASE2_S5_FINAL_AUDIT.md"
$outputPath = "C:\Users\NOUR\Desktop\Free AI Development Hub\Projects\GLOBAL-ARCADE\OPENCODE_PHASE2_S5_FINAL_AUDIT.md"

if (Test-Path $planPath) {
    Write-Host "Found plan file in OpenCode plan directory: $planPath"
    Copy-Item -Path $planPath -Destination $outputPath -Force
    Write-Host "Copied $planPath to $outputPath"
} else {
    $finalContent = $response.TextResponse
    if ([string]::IsNullOrWhiteSpace($finalContent)) {
        $finalContent = $response.RawStdout
    }
    $header = @"
# KYRAXO AI COUNCIL — STAGE S5 FINAL INDEPENDENT AUDIT

- **Author:** OpenCode Independent Security & Architecture Reviewer
- **Model:** opencode/glm-5.3-flash-free
- **Session ID:** $($response.SessionId)
- **Duration:** $([math]::Round($duration, 1))s
- **Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss K")

---

"@
    $fullReport = $header + $finalContent.Trim()
    [System.IO.File]::WriteAllText($outputPath, $fullReport, [System.Text.Encoding]::UTF8)
    Write-Host "Saved response to $outputPath"
}

$savedItem = Get-Item $outputPath
Write-Host "Stage S5 Final Audit Report stored at $($savedItem.FullName) (Size: $($savedItem.Length) bytes)"
