// Lanza `stripe listen` con la MISMA cuenta que usa la API (STRIPE_SECRET_KEY del .env).
// Sin --api-key, la CLI escucha la cuenta con la que se hizo `stripe login`, que
// puede ser otra, y entonces los webhooks del checkout nunca llegan.
require('dotenv/config');
const { spawn } = require('node:child_process');

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Falta STRIPE_SECRET_KEY en el .env');
  process.exit(1);
}

const port = process.env.PORT || 3000;
const args = [
  'listen',
  '--api-key', key,
  '--forward-to', `localhost:${port}/webhooks/stripe`,
  '--events', 'checkout.session.completed',
];

const hijo = spawn('stripe', args, { stdio: 'inherit', shell: process.platform === 'win32' });
hijo.on('exit', (code) => process.exit(code ?? 0));
