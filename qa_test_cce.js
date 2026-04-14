const jwt = require('jsonwebtoken');
const axios = require('axios');

async function run() {
    const secret = "Vidyalayam_QA_Secret_2026_Secure_Key";
    const token = jwt.sign({ 
        userId: '5g19lvuVau0GntctlLBA', 
        role: 'teacher', 
        schoolId: 'VLK-KARI', 
        roleId: 'TCH-0001', 
        email: 'qa.teacher@test.edu', 
        fullName: 'QA Teacher One' 
    }, secret, { expiresIn: '1h' });

    console.log('--- Submitting CCE Marks (FA1 - 19/20) ---');
    try {
        const res = await axios.post('http://localhost:5001/api/cce/marks', {
            studentId: "STU1775570289385",
            subjectId: "Mathematics",
            examType: "FA1",
            academicYear: "2025-26",
            classId: "VK-QA-8A",
            marks: 19
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('SUCCESS:', res.data);
    } catch (err) {
        console.error('FAILED:', err.response ? err.response.data : err.message);
    }
}
run();
