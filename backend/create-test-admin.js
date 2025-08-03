const bcrypt = require('bcryptjs');

async function createTestAdmin() {
    const password = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Email: testadmin@example.com');
    console.log('Password: admin123');
    console.log('Hashed Password:', hashedPassword);
}

createTestAdmin();
