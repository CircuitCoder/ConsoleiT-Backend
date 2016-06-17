db.registrants.find().forEach(function(e) {
  e.internalStatus = {
    payment: false
  },

  db.registrants.save(e);
});

print("Migration finished");
