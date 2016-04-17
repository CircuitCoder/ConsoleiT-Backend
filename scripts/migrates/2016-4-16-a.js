// This file should be executed inside mongo environment

db.confs.find({}).forEach(function(e) {
  var fmap = [{
    db: 'academicZh',
    new: 'academic-zh',
    title: '中文学术团队招募'
  }, {
    db: 'academicEn',
    new: 'academic-en',
    title: '英文学术团队招募'
  }]

  var newForms = [];

  fmap.forEach(function(form) {
    var results= e.registrants[form.db];
    results.forEach(function(sub) {
      abcdefg = 10;
      db.registrants.insert({
        conf: e._id,
        form: form.new,
        user: parseInt(sub._id),
        status: '未确定',
        submission: sub.submission,
        fromGroup: 0,
        locked: sub.locked,
        note: sub.note,
      });
    })

    newForms.push({
      _id: form.new,
      title: form.title,
      content: e.forms[form.db],
      status: 'closed',

      viewers: [],
      moderators: [],
      admins: [],

      openOn: [],
      closedOn: [],
      submissionStatus: [],
    });
  });

  e.forms = newForms;
  e.available = true;
  e.archived = false;

  e.currentStage = '喵';
  e.stages = ['喵'];

  delete e.status;
  delete e.registrants;
  db.confs.save(e);
});
print("Finished. Now you need to manually apply roles to the forms");

