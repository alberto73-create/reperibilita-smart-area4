// Vercel API Proxy per Google Apps Script
import type { VercelRequest, VercelResponse } from '@vercel/node';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

if (!APPS_SCRIPT_URL) {
  throw new Error('Missing APPS_SCRIPT_URL environment variable');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'path') continue;
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, item));
      } else if (typeof value === 'string') {
        params.set(key, value);
      }
    }

    const url = `${APPS_SCRIPT_URL}?${params.toString()}`;

    const response = await fetch(url, {
      method: req.method as string,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    if (!response.ok) {
      throw new Error('Apps Script error: ' + response.statusText);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
