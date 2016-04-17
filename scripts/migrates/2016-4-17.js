db.confs.find().forEach(function(e) {
  e.forms.forEach(function(f) {
    var cont = JSON.parse(f.content);
    db.registrants.find({
      conf: e._id,
      form: f._id
    }).forEach(function(reg) {
      var sub = JSON.parse(reg.submission);
      cont.forEach(function(field, index) {
        if(field.type == "checkbox") {
          if(sub[index] != undefined) {
            var selected = {};
            field.choices.forEach(function(choice, ci) {
              if(sub[index][choice]) selected[ci] = true;
            });
            sub[index] = selected;
          }
        } else if(field.type == "radio") {
          if(sub[index]!=undefined) {
            var selected = undefined;
            field.choices.forEach(function(choice, ci) {
              if(sub[index] == choice) selected = ci;
            });
            sub[index] = selected;
          }
        }
      });

      reg.submission = JSON.stringify(sub);
      db.registrants.save(reg);
    });
  });
});

print("Migration completed.")
