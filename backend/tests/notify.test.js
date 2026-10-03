// Unit tests for the REAL notification transports (F1 fix).
// - EmailProvider: full SMTP protocol exchange against a loopback
//   stub server (AUTH LOGIN, MAIL FROM, RCPT TO, DATA, QUIT) —
//   proves the nodemailer path returns SENT and the wire payload
//   is correct. No external network is touched.
// - Unconfigured channels stay honestly SIMULATED.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const test = require('node:test');
const assert = require('node:assert');
const net = require('net');

// Minimal SMTP server stub: advertises AUTH LOGIN, records the
// session, accepts one message.
function startSmtpStub() {
    return new Promise((resolve) => {
        const seen = { from: null, to: null, data: '', authUser: null };
        const server = net.createServer((socket) => {
            let inData = false, authStage = 0;
            socket.write('220 stub ESMTP\r\n');
            socket.on('data', (chunk) => {
                const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
                for (const line of lines) {
                    if (inData) {
                        if (line === '.') { inData = false; socket.write('250 OK queued\r\n'); }
                        else seen.data += line + '\n';
                        continue;
                    }
                    const cmd = line.slice(0, 4).toUpperCase();
                    if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) {
                        socket.write('250-stub\r\n250 AUTH LOGIN\r\n');
                    } else if (cmd.startsWith('AUTH')) {
                        authStage = 1; socket.write('334 VXNlcm5hbWU6\r\n'); // "Username:"
                    } else if (authStage === 1) {
                        seen.authUser = Buffer.from(line, 'base64').toString(); authStage = 2;
                        socket.write('334 UGFzc3dvcmQ6\r\n'); // "Password:"
                    } else if (authStage === 2) {
                        authStage = 0; socket.write('235 authenticated\r\n');
                    } else if (cmd.startsWith('MAIL')) {
                        seen.from = line; socket.write('250 OK\r\n');
                    } else if (cmd.startsWith('RCPT')) {
                        seen.to = line; socket.write('250 OK\r\n');
                    } else if (cmd.startsWith('DATA')) {
                        inData = true; socket.write('354 go ahead\r\n');
                    } else if (cmd.startsWith('QUIT')) {
                        socket.write('221 bye\r\n'); socket.end();
                    } else {
                        socket.write('250 OK\r\n');
                    }
                }
            });
        });
        server.listen(0, '127.0.0.1', () => resolve({ server, seen, port: server.address().port }));
    });
}

test('EmailProvider delivers over real SMTP (loopback stub): AUTH, envelope, body, SENT', async () => {
    // Point the provider at the stub. Save/restore env.
    const saved = {};
    const setEnv = (k, v) => { saved[k] = process.env[k]; process.env[k] = v; };
    setEnv('SMTP_HOST', '127.0.0.1'); setEnv('SMTP_PORT', '0'); setEnv('SMTP_USER', 'officer@sipcot.test');
    setEnv('SMTP_PASS', 'secret-pass'); setEnv('SMTP_SECURE', 'false'); setEnv('SMTP_FROM', 'no-reply@sipcot.test');

    const stub = await startSmtpStub();
    process.env.SMTP_PORT = String(stub.port);

    // Re-require a fresh provider instance bound to this env.
    delete require.cache[require.resolve('../services/notify')];
    const { PROVIDERS } = require('../services/notify');

    try {
        assert.strictEqual(PROVIDERS.email.configured, true);
        assert.strictEqual(PROVIDERS.email.transportImplemented, true);

        const status = await PROVIDERS.email.deliver('industry@example.test', 'Reminder: Q3 return', 'File your Q3 2026 return by Oct 14.');
        assert.strictEqual(status, 'SENT');
        assert.strictEqual(stub.seen.authUser, 'officer@sipcot.test');
        assert.ok(stub.seen.from.includes('no-reply@sipcot.test'), 'envelope from');
        assert.ok(stub.seen.to.includes('industry@example.test'), 'envelope to');
        assert.ok(stub.seen.data.includes('Q3 2026 return'), 'body content on the wire');
    } finally {
        stub.server.close();
        for (const [k, v] of Object.entries(saved)) {
            if (v === undefined) delete process.env[k]; else process.env[k] = v;
        }
        delete require.cache[require.resolve('../services/notify')];
    }
});

test('Unconfigured channels remain honestly SIMULATED (never "sent")', async () => {
    const saved = { H: process.env.SMTP_HOST, U: process.env.SMTP_USER, K: process.env.SMS_PROVIDER_KEY };
    delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMS_PROVIDER_KEY;
    delete require.cache[require.resolve('../services/notify')];
    const { PROVIDERS } = require('../services/notify');
    try {
        assert.strictEqual(PROVIDERS.email.configured, false);
        assert.strictEqual(await PROVIDERS.email.deliver('x@y.test', 's', 'b'), 'SIMULATED');
        assert.strictEqual(await PROVIDERS.sms.deliver('+910000000000', 'b'), 'SIMULATED');
        assert.strictEqual(await PROVIDERS.email.deliver(null, 's', 'b'), 'SKIPPED');
    } finally {
        for (const [k, v] of Object.entries({ SMTP_HOST: saved.H, SMTP_USER: saved.U, SMS_PROVIDER_KEY: saved.K })) {
            if (v === undefined) delete process.env[k]; else process.env[k] = v;
        }
        delete require.cache[require.resolve('../services/notify')];
    }
});
