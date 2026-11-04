const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const userPath = require.resolve('../models/User');
const blacklistPath = require.resolve('../models/TokenBlacklist');
const bcryptPath = require.resolve('bcryptjs');
const jwtPath = require.resolve('jsonwebtoken');
const nodemailerPath = require.resolve('nodemailer');

const saved = {
  user: require.cache[userPath],
  blacklist: require.cache[blacklistPath],
  bcrypt: require.cache[bcryptPath],
  jwt: require.cache[jwtPath],
  nodemailer: require.cache[nodemailerPath]
};

const fakeUser = {
  findOne: async () => ({
    _id: 'user-1',
    fullName: 'Banana Fan',
    username: 'banana',
    email: 'banana@example.com',
    password: 'hashed-pass',
    role: 'USER',
    points: 10,
    currentStreak: 2,
    failedLoginAttempts: 0,
    lockUntil: null,
    save: async () => {}
  })
};

const fakeBlacklist = {};
const fakeBcrypt = {
  compare: async () => true,
  hash: async (value) => `hashed:${value}`
};
const fakeJwt = {
  sign: () => 'mock-token',
  verify: () => ({ userId: 'user-1', role: 'USER' }),
  decode: () => ({ exp: 1234567890 })
};
const fakeNodemailer = {
  createTransport: () => ({
    sendMail: async () => undefined
  })
};

require.cache[userPath] = { id: userPath, filename: userPath, loaded: true, exports: fakeUser };
require.cache[blacklistPath] = { id: blacklistPath, filename: blacklistPath, loaded: true, exports: fakeBlacklist };
require.cache[bcryptPath] = { id: bcryptPath, filename: bcryptPath, loaded: true, exports: fakeBcrypt };
require.cache[jwtPath] = { id: jwtPath, filename: jwtPath, loaded: true, exports: fakeJwt };
require.cache[nodemailerPath] = { id: nodemailerPath, filename: nodemailerPath, loaded: true, exports: fakeNodemailer };

process.env.JWT_SECRET = 'test-secret';
process.env.SMTP_HOST = 'smtp.test';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'mailer@test';
process.env.SMTP_PASS = 'secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

test('loginUser returns a token for valid credentials', async () => {
  const { loginUser } = require('../controllers/authController');

  let response;
  const req = { body: { login: 'banana', password: 'secret' } };
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      response = payload;
      return payload;
    }
  };

  await loginUser(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(response.success, true);
  assert.equal(response.token, 'mock-token');
  assert.equal(response.user.username, 'banana');
});

for (const [key, value] of Object.entries(saved)) {
  if (value) {
    require.cache[key] = value;
  } else {
    delete require.cache[key];
  }
}
