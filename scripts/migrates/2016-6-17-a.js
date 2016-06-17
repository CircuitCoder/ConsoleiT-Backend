db.forms.find().forEach((e) => {
  e.indicators = e.registrantStatus;
  e.meta = {
    payment: false,
  };

  delete e.registrantStatus;

  db.forms.save(e);
});

print("Migration finished");
