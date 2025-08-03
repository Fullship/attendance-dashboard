const bcrypt = require('bcryptjs');

async function createHashedPassword() {
  const password = 'test123';
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  
  // Test verification
  const isValid = await bcrypt.compare(password, hash);
  console.log(`Verification: ${isValid}`);
}

createHashedPassword();
