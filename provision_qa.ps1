$superAdminKey = 'VIDLYM_SUPER_2026_XK9M'
$baseUrl = 'http://localhost:5001'

$headers = @{
    'x-super-admin-key' = $superAdminKey
    'Content-Type' = 'application/json'
}

# 1. Create School V-KARI450
$schoolBody = @{
    schoolName = "Vidhaya Layam Karimnagar"
    location = "Karimnagar"
    address = "Main Road, Karimnagar"
    phone = "9876543210"
    email = "admin@vidhayalayam.edu.in"
    principalName = "QA Principal"
    principalEmail = "principal@vidhaylayam-krmngr.edu.in"
    principalPassword = "School@123"
    board = "State Board"
    subscriptionPlan = "premium"
} | ConvertTo-Json

Write-Host "--- Creating School ---"
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/api/super/schools/create" -Method POST -Headers $headers -Body $schoolBody
    $schoolId = $r.schoolId
    Write-Host "✅ Created School: $schoolId"
} catch {
    Write-Host "⚠️ School might already exist: $($_.Exception.Message)"
    $schoolId = "V-KARI450" # Fixed fallback for this test school ID
}

# 2. Login as Principal to get JWT
$loginBody = @{
    email = "principal@vidhaylayam-krmngr.edu.in"
    password = "School@123"
} | ConvertTo-Json

Write-Host "--- Logging in as Principal ---"
$loginResp = Invoke-RestMethod -Uri "$baseUrl/api/login" -Method POST -ContentType 'application/json' -Body $loginBody
$jwt = $loginResp.token
$pHeaders = @{ 'Authorization' = "Bearer $jwt" }
Write-Host "✅ Logged in. JWT: $($jwt.Substring(0,10))..."

# 3. Provision Teacher (TCH-0001)
$teacherBody = @{
    fullName = "QA Teacher One"
    email = "qa.teacher@test.edu"
    password = "Teacher@123"
    role = "teacher"
    roleId = "TCH-0001"
    schoolId = $schoolId
} | ConvertTo-Json

Write-Host "--- Onboarding Teacher ---"
try {
    Invoke-RestMethod -Uri "$baseUrl/api/register" -Method POST -ContentType 'application/json' -Body $teacherBody
    Write-Host "✅ Teacher Onboarded"
} catch { Write-Host "❌ Teacher error: $($_.Exception.Message)" }

# 4. Provision Student/Parent (SP-0001)
$studentBody = @{
    fullName = "QA Parent One"
    email = "qa.parent@test.edu"
    password = "Parent@123"
    role = "parent"
    roleId = "SP-0001"
    schoolId = $schoolId
} | ConvertTo-Json

Write-Host "--- Onboarding Parent ---"
try {
    Invoke-RestMethod -Uri "$baseUrl/api/register" -Method POST -ContentType 'application/json' -Body $studentBody
    Write-Host "✅ Parent Onboarded"
} catch { Write-Host "❌ Parent error: $($_.Exception.Message)" }

# 5. Provision Driver (DRV-0001)
$driverBody = @{
    fullName = "QA Driver One"
    email = "qa.driver@test.edu"
    password = "Driver@123"
    role = "driver"
    roleId = "DRV-0001"
    schoolId = $schoolId
} | ConvertTo-Json

Write-Host "--- Onboarding Driver ---"
try {
    Invoke-RestMethod -Uri "$baseUrl/api/register" -Method POST -ContentType 'application/json' -Body $driverBody
    Write-Host "✅ Driver Onboarded"
} catch { Write-Host "❌ Driver error: $($_.Exception.Message)" }
