require('dotenv').config();
const APP_PORT = process.env.APP_PORT;
const MAIL_HOST = process.env.MAIL_HOST;
const MAIL_CLIENT_PORT = process.env.MAIL_CLIENT_PORT;

console.log('APP_PORT:', APP_PORT);
console.log('MAIL_HOST:', MAIL_HOST);
console.log('MAIL_CLIENT_PORT:', MAIL_CLIENT_PORT);
console.log('APP_URL:', `http://localhost:${APP_PORT}`);
console.log('MAIL_URL:', `http://${MAIL_HOST}:${MAIL_CLIENT_PORT}`);
