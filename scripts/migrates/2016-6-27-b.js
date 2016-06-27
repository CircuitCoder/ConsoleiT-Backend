db.forms.find().forEach(function(e) {
  e.content.forEach(function(c) {
    if(c.type === 'checkbox' || c.type === 'radio') {
      const nc = c.choices.map(function(choice) {
        return {
          title: choice,
          disabled: false,
        };
      });
      c.choices = nc;
    }
  });

  db.forms.save(e);
});

print("Migration finished");
