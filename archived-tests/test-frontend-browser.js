// Test the frontend's fetchPendingCounts function
console.log('Testing frontend pending counts...');

// Simulate the AdminDashboard's fetchPendingCounts function
async function testFrontendPendingCounts() {
  try {
    // Get the token from localStorage (assuming user is logged in)
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage - user needs to log in');
      return;
    }

    console.log('Token found, testing API calls...');

    // Test clock requests
    const clockResponse = await fetch(
      'http://localhost:5000/api/admin/clock-requests?page=1&limit=1&status=pending',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (clockResponse.ok) {
      const clockData = await clockResponse.json();
      console.log('✅ Clock requests API response:', clockData);
      console.log('Clock requests count:', clockData.pagination.total);
    } else {
      console.error('❌ Clock requests API failed:', clockResponse.status);
    }

    // Test leave requests
    const leaveResponse = await fetch(
      'http://localhost:5000/api/admin-leave/admin/leave-requests?page=1&limit=1&status=pending',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (leaveResponse.ok) {
      const leaveData = await leaveResponse.json();
      console.log('✅ Leave requests API response:', leaveData);
      console.log('Leave requests count:', leaveData.pagination.total);
    } else {
      console.error('❌ Leave requests API failed:', leaveResponse.status);
    }
  } catch (error) {
    console.error('❌ Error testing frontend API calls:', error);
  }
}

// Run the test
testFrontendPendingCounts();
