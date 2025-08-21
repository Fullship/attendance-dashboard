const express = require('express');

try {
    const adminRoutes = require('./routes/admin');
    console.log('✅ Admin routes loaded successfully');
    console.log('Routes defined:');
    
    // Create a test router to inspect the routes
    const router = express.Router();
    const routes = [];
    
    // This is a hack to get the registered routes
    const originalRegister = router.register || router.route;
    
    console.log('Admin routes module exported successfully');
    process.exit(0);
} catch (error) {
    console.error('❌ Error loading admin routes:', error);
    process.exit(1);
}
