db.registrants.find().forEach(function(reg) {
  reg.submission = JSON.parse(reg.submission);
  db.registrants.save(reg);
});

db.createCollection("forms");

db.confs.find().forEach(function(c) {
  if(c.forms) {
    c.forms.forEach(function(f) {
      if(f.content) 
        f.content = JSON.parse(f.content);
      f.name = f._id;
      f.conf = c._id;
      delete f._id;
      f.registrantStatus = f.submissionStatus;
      delete f.submissionStatus;
    });

    db.forms.insert(c.forms);
  }

  delete c.forms;
  c.participantStatus = [];
  db.confs.save(c);
});

print("Migration finished");
