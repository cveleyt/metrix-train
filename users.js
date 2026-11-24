/* Users and programs. Each user logs in with their own username and password and gets their own
   program and their own data on the phone. Keep passwords out of this file: only the hash is stored.
   Hash = sha256("mx-train|" + lowercase username + "|" + password).
   To add a user: put their program in a new file (e.g. program-sara.js) that sets
   window.PROGRAMS.sara = { name, weeks, days: [...] }, load it in index.html after this file,
   then add a line to USERS below. Elie is the owner and keeps the original storage keys. */
(function () {
  window.PROGRAMS = { main: window.PROGRAM };
  window.USERS = [
    { id: 'elie', name: 'Elie', hash: '0123ff82cefb4c6119472a6f8fcf5bc0e5a5e518a0258a530becf887baf78f0f', program: 'main', owner: true, legacy: true }
    // { id: 'sara', name: 'Sara', hash: '...', program: 'sara' },
  ];
})();
