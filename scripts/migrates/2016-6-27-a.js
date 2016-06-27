db.registrants.find().forEach(function(e) {
  if(!e.internalStatus) e.payment = false;
  else e.payment = !!e.internalStatus.payment;

  delete e.internalStatus;
  db.registrants.save(e);
});

print("Migration finished");
