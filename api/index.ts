/**
 * Vercel Serverless Function
 * Wrapper para o Express app
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/server';

export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
