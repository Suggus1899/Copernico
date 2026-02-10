const axios = require('axios');

// Test script to check if academic fields are being returned

async function testAcademicFields() {
    try {
        console.log('🔍 Testing academic fields for available educators...');
        
        // First, let's sign in as a student to get a token
        console.log('📝 Signing in as student...');
        const signInResponse = await axios.post('http://localhost:4002/api/auth/signin', {
            email: 'student@example.com', // Change to your student test email
            password: 'Password123!' // Change to your student test password
        });
        
        const token = signInResponse.data.token;
        console.log('✅ Sign in successful');
        
        // Now, get available educators with the token
        console.log('\n📚 Getting available educators...');
        const educatorsResponse = await axios.get('http://localhost:4002/api/users/available-educators?role=tutor&limit=100', {
            headers: {
                'auth-token': token,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ Found ${educatorsResponse.data.data.length} available tutors`);
        
        // Check each tutor's academic fields
        educatorsResponse.data.data.forEach((tutor, index) => {
            console.log(`\n🧑‍🏫 Tutor ${index + 1}: ${tutor.personalInfo?.firstName} ${tutor.personalInfo?.lastName}`);
            console.log(`   📧 Email: ${tutor.email}`);
            console.log(`   🎓 Role: ${tutor.role}`);
            
            // Check new academic fields
            const academicFields = {
                'Especialización': tutor.personalInfo?.specialty,
                'Títulos y Grados': tutor.personalInfo?.degrees,
                'Experiencia Docente': tutor.personalInfo?.experience,
                'Certificaciones': tutor.personalInfo?.certifications,
                'Biografía': tutor.personalInfo?.bio
            };
            
            console.log('   📚 Información Académica:');
            Object.keys(academicFields).forEach(key => {
                if (academicFields[key]) {
                    console.log(`     - ${key}: ${academicFields[key]}`);
                } else {
                    console.log(`     - ${key}: Not available`);
                }
            });
            
            // Check if any academic fields are missing
            const missingFields = Object.keys(academicFields).filter(key => !academicFields[key]);
            if (missingFields.length > 0) {
                console.log(`     🔍 ${missingFields.length} fields not available`);
            }
            
            // Check existing academic profile fields
            if (tutor.academicProfile) {
                console.log('   📖 Perfil Académico Existente:');
                if (tutor.academicProfile.institution) {
                    console.log(`     - Institución: ${tutor.academicProfile.institution}`);
                }
                if (tutor.academicProfile.title) {
                    console.log(`     - Título: ${tutor.academicProfile.title}`);
                }
                if (tutor.academicProfile.experienceYears) {
                    console.log(`     - Años de experiencia: ${tutor.academicProfile.experienceYears}`);
                }
                if (tutor.academicProfile.skills) {
                    console.log(`     - Habilidades: ${tutor.academicProfile.skills.join(', ')}`);
                }
            }
        });
        
        console.log('\n✅ All tutors checked');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('📝 Response status:', error.response.status);
            console.error('📝 Response data:', error.response.data);
        }
    }
}

// Run the test
testAcademicFields();