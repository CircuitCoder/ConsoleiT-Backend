db.users.find({}).forEach(function(e) {
  e.initialized = false;
  delete e.yearEnrolled;
  delete e.IDNumber;
  delete e.IDType;
  db.users.save(e);
});

print("Migration completed");
