const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./database/attendance.db');

// Sample organizational data for demo
const demoEmployees = [
  { firstName: 'John', lastName: 'Smith', email: 'john.smith@company.com', isAdmin: true },
  { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@company.com', isAdmin: false },
  { firstName: 'Mike', lastName: 'Brown', email: 'mike.brown@company.com', isAdmin: false },
  { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@company.com', isAdmin: false },
  { firstName: 'David', lastName: 'Wilson', email: 'david.wilson@company.com', isAdmin: false },
  { firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.anderson@company.com', isAdmin: false },
  { firstName: 'Tom', lastName: 'Taylor', email: 'tom.taylor@company.com', isAdmin: false },
  { firstName: 'Anna', lastName: 'Martinez', email: 'anna.martinez@company.com', isAdmin: false },
  { firstName: 'James', lastName: 'Garcia', email: 'james.garcia@company.com', isAdmin: false },
  { firstName: 'Rachel', lastName: 'Lee', email: 'rachel.lee@company.com', isAdmin: false },
];

// Create teams for organization
const demoTeams = [
  { name: 'Engineering', description: 'Software Development Team' },
  { name: 'Marketing', description: 'Marketing and Communications' },
  { name: 'Sales', description: 'Sales and Business Development' },
];

// Create locations
const demoLocations = [
  { name: 'New York Office', address: '123 Main St, New York, NY' },
  { name: 'San Francisco Office', address: '456 Market St, San Francisco, CA' },
  { name: 'Remote', address: 'Remote Work' },
];

async function createDemoData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Insert locations first
      const insertLocation = db.prepare("INSERT OR IGNORE INTO locations (name, address) VALUES (?, ?)");
      demoLocations.forEach(location => {
        insertLocation.run(location.name, location.address);
      });
      insertLocation.finalize();

      // Insert teams
      const insertTeam = db.prepare("INSERT OR IGNORE INTO teams (name, description) VALUES (?, ?)");
      demoTeams.forEach(team => {
        insertTeam.run(team.name, team.description);
      });
      insertTeam.finalize();

      // Get the team and location IDs
      db.all("SELECT id, name FROM teams", (err, teams) => {
        if (err) {
          reject(err);
          return;
        }

        db.all("SELECT id, name FROM locations", (err, locations) => {
          if (err) {
            reject(err);
            return;
          }

          // Insert employees with team and location assignments
          const insertEmployee = db.prepare(`
            INSERT OR IGNORE INTO users (firstName, lastName, email, password, isAdmin, teamId, locationId) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          demoEmployees.forEach((employee, index) => {
            const teamId = teams[index % teams.length]?.id;
            const locationId = locations[index % locations.length]?.id;
            const password = '$2a$10$defaultpasswordhash'; // Default hashed password

            insertEmployee.run(
              employee.firstName,
              employee.lastName,
              employee.email,
              password,
              employee.isAdmin ? 1 : 0,
              teamId,
              locationId
            );
          });

          insertEmployee.finalize();

          // Set team managers (first employee in each team becomes the manager)
          let updateIndex = 0;
          teams.forEach(team => {
            const updateTeam = db.prepare("UPDATE teams SET managerId = (SELECT id FROM users WHERE teamId = ? LIMIT 1) WHERE id = ?");
            updateTeam.run(team.id, team.id);
            updateTeam.finalize();
          });

          console.log('Demo organizational data created successfully!');
          console.log(`Created ${demoEmployees.length} employees`);
          console.log(`Created ${demoTeams.length} teams`);
          console.log(`Created ${demoLocations.length} locations`);
          
          resolve();
        });
      });
    });
  });
}

// Run the demo data creation
createDemoData()
  .then(() => {
    console.log('Demo data setup complete!');
    db.close();
  })
  .catch((error) => {
    console.error('Error creating demo data:', error);
    db.close();
  });
