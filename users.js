/* Users and programs. Each user logs in with their own username and password and gets their own
   program and their own data on the phone. Login goes through the cloud account, so no password or hash is stored here.
   To add a user: put their program in a new file (e.g. program-sara.js) that sets
   window.PROGRAMS.sara = { name, weeks, days: [...] }, load it in index.html after this file,
   then add a line to USERS below. Elie is the owner and keeps the original storage keys. */
(function () {
  window.PROGRAMS = { main: window.PROGRAM };
  window.USERS = [
    { id: 'elie', name: 'Elie', hash: '', program: 'main', owner: true, legacy: true }
    // { id: 'sara', name: 'Sara', hash: '...', program: 'sara' },
  ];
})();
