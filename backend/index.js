import { createApp } from './src/app.js';
import { config, isSupabaseConfigured } from './src/config/index.js';

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🍿 Caramel Popcorn API listening on http://localhost:${config.port}`);
  // eslint-disable-next-line no-console
  console.log(`   env: ${config.env} | supabase: ${isSupabaseConfigured ? 'configured' : 'NOT configured'}`);
});
