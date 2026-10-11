const fs = require('node:fs');
function isContainerQa(env = process.env, platform = process.platform, read = fs.readFileSync) {
  if (env.BEATZUCKER_ISOLATED_QA !== '1') return false;
  if (platform !== 'linux' || env.DATABASE_URL !== 'file:/app/data/production.db' ||
      env.NEXTAUTH_URL !== 'http://localhost:3012')
    throw Error('Container QA requires the dedicated database and localhost test URL');
  // The test container was created with --network none. Refuse bridged/public
  // production containers even if the operator accidentally sets the QA flag.
  const routes = read('/proc/net/route', 'utf8').trim().split('\n').slice(1);
  if (routes.some(line => line.trim())) throw Error('Container QA requires --network none');
  if (env.RESEND_API_KEY || env.GOOGLE_CLIENT_SECRET)
    throw Error('Container QA must not have real mail or Google credentials');
  return true;
}
module.exports = { isContainerQa };
