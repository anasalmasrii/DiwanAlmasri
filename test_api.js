const http = require('http');
// Need a valid token to bypass auth. I can just bypass auth for the test if I want, or I can login as super_admin.
// Let's login first.
const loginData = JSON.stringify({ username: 'admin', password: 'password' }); // We don't know the password...
