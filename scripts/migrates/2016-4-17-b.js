db.users.find().forEach(function(e) {
  e.experiences = [];
  e.gender = 'unknown';
  db.users.save(e);
});

print("Migration completed.");
