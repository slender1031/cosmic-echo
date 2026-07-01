# Download Rider-Waite-Smith tarot images from Internet Archive
# Run in PowerShell:
#   cd "C:\Users\Admin\Desktop\学习营第二期\cosmic-echo-demo"
#   .\scripts\download-rws-ia.ps1

$ErrorActionPreference = "SilentlyContinue"
$ProgressPreference = "SilentlyContinue"

$outDir = "public\tarot"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Internet Archive RWS deck - predictable filenames
# rwts00.jpg = Fool, rwts01.jpg = Magician, ..., rwts21.jpg = World
# rwts22.jpg = Ace of Cups, rwts23 = 2 of Cups, etc.
# Note: IA scan order may vary; we try multiple naming patterns

$baseUrl = "https://archive.org/download/Rider-Waite_Tarot_Deck"

# Card ID -> IA filename (try multiple patterns)
# Pattern 1: rwtsNN.jpg (00-77)
# Patern 2: RWS_Tarot_NN_<name>.jpg

$cards = @(
    # Major Arcana (0-21)
    @{id="fool";        ia="rwts00.jpg"},
    @{id="magician";    ia="rwts01.jpg"},
    @{id="high-priestess"; ia="rwts02.jpg"},
    @{id="empress";     ia="rwts03.jpg"},
    @{id="emperor";     ia="rwts04.jpg"},
    @{id="hierophant";  ia="rwts05.jpg"},
    @{id="lovers";      ia="rwts06.jpg"},
    @{id="chariot";     ia="rwts07.jpg"},
    @{id="strength";     ia="rwts08.jpg"},
    @{id="hermit";      ia="rwts09.jpg"},
    @{id="wheel";        ia="rwts10.jpg"},
    @{id="justice";      ia="rwts11.jpg"},
    @{id="hanged-man";   ia="rwts12.jpg"},
    @{id="death";        ia="rwts13.jpg"},
    @{id="temperance";   ia="rwts14.jpg"},
    @{id="devil";        ia="rwts15.jpg"},
    @{id="tower";        ia="rwts16.jpg"},
    @{id="star";         ia="rwts17.jpg"},
    @{id="moon";         ia="rwts18.jpg"},
    @{id="sun";          ia="rwts19.jpg"},
    @{id="judgement";    ia="rwts20.jpg"},
    @{id="world";        ia="rwts21.jpg"},
    # Minor Arcana - Cups (22-35)
    @{id="ace-cups";     ia="rwts22.jpg"},
    @{id="two-cups";     ia="rwts23.jpg"},
    @{id="three-cups";   ia="rwts24.jpg"},
    @{id="four-cups";    ia="rwts25.jpg"},
    @{id="five-cups";    ia="rwts26.jpg"},
    @{id="six-cups";     ia="rwts27.jpg"},
    @{id="seven-cups";   ia="rwts28.jpg"},
    @{id="eight-cups";   ia="rwts29.jpg"},
    @{id="nine-cups";    ia="rwts30.jpg"},
    @{id="ten-cups";     ia="rwts31.jpg"},
    @{id="page-cups";    ia="rwts32.jpg"},
    @{id="knight-cups";  ia="rwts33.jpg"},
    @{id="queen-cups";   ia="rwts34.jpg"},
    @{id="king-cups";    ia="rwts35.jpg"},
    # Pentacles (36-49)
    @{id="ace-pentacles";     ia="rwts36.jpg"},
    @{id="two-pentacles";     ia="rwts37.jpg"},
    @{id="three-pentacles";   ia="rwts38.jpg"},
    @{id="four-pentacles";    ia="rwts39.jpg"},
    @{id="five-pentacles";    ia="rwts40.jpg"},
    @{id="six-pentacles";     ia="rwts41.jpg"},
    @{id="seven-pentacles";   ia="rwts42.jpg"},
    @{id="eight-pentacles";   ia="rwts43.jpg"},
    @{id="nine-pentacles";    ia="rwts44.jpg"},
    @{id="ten-pentacles";     ia="rwts45.jpg"},
    @{id="page-pentacles";    ia="rwts46.jpg"},
    @{id="knight-pentacles";  ia="rwts47.jpg"},
    @{id="queen-pentacles";   ia="rwts48.jpg"},
    @{id="king-pentacles";    ia="rwts49.jpg"},
    # Swords (50-63)
    @{id="ace-swords";     ia="rwts50.jpg"},
    @{id="two-swords";     ia="rwts51.jpg"},
    @{id="three-swords";   ia="rwts52.jpg"},
    @{id="four-swords";    ia="rwts53.jpg"},
    @{id="five-swords";    ia="rwts54.jpg"},
    @{id="six-swords";     ia="rwts55.jpg"},
    @{id="seven-swords";   ia="rwts56.jpg"},
    @{id="eight-swords";   ia="rwts57.jpg"},
    @{id="nine-swords";    ia="rwts58.jpg"},
    @{id="ten-swords";     ia="rwts59.jpg"},
    @{id="page-swords";    ia="rwts60.jpg"},
    @{id="knight-swords";  ia="rwts61.jpg"},
    @{id="queen-swords";   ia="rwts62.jpg"},
    @{id="king-swords";    ia="rwts63.jpg"},
    # Wands (64-77)
    @{id="ace-wands";     ia="rwts64.jpg"},
    @{id="two-wands";     ia="rwts65.jpg"},
    @{id="three-wands";   ia="rwts66.jpg"},
    @{id="four-wands";    ia="rwts67.jpg"},
    @{id="five-wands";    ia="rwts68.jpg"},
    @{id="six-wands";     ia="rwts69.jpg"},
    @{id="seven-wands";   ia="rwts70.jpg"},
    @{id="eight-wands";   ia="rwts71.jpg"},
    @{id="nine-wands";    ia="rwts72.jpg"},
    @{id="ten-wands";     ia="rwts73.jpg"},
    @{id="page-wands";    ia="rwts74.jpg"},
    @{id="knight-wands";  ia="rwts75.jpg"},
    @{id="queen-wands";   ia="rwts76.jpg"},
    @{id="king-wands";    ia="rwts77.jpg"}
)

$total = $cards.Count
$ok = 0
$failed = @()

Write-Host "Downloading $total RWS tarot images from Internet Archive..." -ForegroundColor Cyan
Write-Host ("-" * 60)

foreach ($i in 0..($total-1)) {
    $card = $cards[$i]
    $cardId = $card.id
    $iaFile = $card.ia
    $outPath = Join-Path $outDir "$cardId.jpg"

    if (Test-Path $outPath) {
        Write-Host "  [$('{0,2}' -f ($i+1))/$total] $cardId - already exists, skip" -ForegroundColor DarkGray
        $ok++
        continue
    }

    Write-Host "  [$('{0,2}' -f ($i+1))/$total] $cardId ... " -NoNewline

    $url = "$baseUrl/$iaFile"
    try {
        Invoke-WebRequest -Uri $url -OutFile $outPath -TimeoutSec 30 -UseBasicParsing
        if (Test-Path $outPath) {
            $size = (Get-Item $outPath).Length
            Write-Host "OK ($('{0:N0}' -f ($size/1KB)) KB)" -ForegroundColor Green
            $ok++
        } else {
            Write-Host "FAILED (empty)" -ForegroundColor Red
            $failed += $cardId
        }
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failed += $cardId
    }

    Start-Sleep -Milliseconds 300
}

Write-Host ("-" * 60)
Write-Host "Done! $ok/$total images ready." -ForegroundColor Cyan
if ($failed.Count -gt 0) {
    Write-Host "Failed ($($failed.Count)): $($failed -join ', ')" -ForegroundColor Yellow
    Write-Host "Re-run this script to retry failed downloads."
}
