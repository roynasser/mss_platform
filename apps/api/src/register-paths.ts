import 'module-alias/register';
import { addAliases } from 'module-alias';
import * as path from 'path';

addAliases({
  '@': path.resolve(__dirname),
  '@/types': path.resolve(__dirname, 'types'),
  '@/models': path.resolve(__dirname, 'models'),
  '@/controllers': path.resolve(__dirname, 'controllers'),
  '@/middleware': path.resolve(__dirname, 'middleware'),
  '@/routes': path.resolve(__dirname, 'routes'),
  '@/services': path.resolve(__dirname, 'services'),
  '@/utils': path.resolve(__dirname, 'utils'),
  '@/database': path.resolve(__dirname, 'database')
});