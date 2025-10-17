# PowerShell script to test Raid-Helper webhook integration
# Usage: .\test_webhook.ps1

Write-Host "=== Raid-Helper Webhook Test ===" -ForegroundColor Cyan
Write-Host ""

$webhookUrl = "https://ffxi-linkshell-manager-production.up.railway.app/api/webhooks/raid-helper"
$testPayloadFile = "test_raid_helper_webhook.json"

# Check if test payload file exists
if (-not (Test-Path $testPayloadFile)) {
    Write-Host "Error: Test payload file not found: $testPayloadFile" -ForegroundColor Red
    Write-Host "Please ensure test_raid_helper_webhook.json exists in this directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "Webhook URL: $webhookUrl" -ForegroundColor Green
Write-Host "Test Payload: $testPayloadFile" -ForegroundColor Green
Write-Host ""

# Read test payload
$testPayload = Get-Content $testPayloadFile -Raw

Write-Host "Sending webhook request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $testPayload `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host

    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Check Railway logs for webhook processing"
    Write-Host "2. Query database: SELECT * FROM events WHERE raid_helper_id = 'test_event_12345';"
    Write-Host "3. Visit your website and check Events tab"
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ Error!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "- Verify backend is deployed and running"
    Write-Host "- Check Railway logs for errors"
    Write-Host "- Ensure database migration 032 has run"
    exit 1
}
