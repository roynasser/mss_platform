// Bootstrap file to set up path mapping before importing main server
import 'module-alias/register';
import { addAlias } from 'module-alias';
import path from 'path';

// Set up path aliases to match tsconfig.json
addAlias('@', path.join(__dirname));

// Now import and start the server
import('./server');