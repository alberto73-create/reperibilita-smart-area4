// Vercel API Proxy per Google Apps Script
import type { VercelRequest, VercelResponse } from '@vercel/node';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;

  if (!appsScriptUrl) {
    res.status(500).json({
      success: false,
      error: 'Missing APPS_SCRIPT_URL environment variable in Vercel',
    });
    return;
  }

  try {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
      } else if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }

    const separator = appsScriptUrl.includes('?') ? '&' : '?';
    const targetUrl = `${appsScriptUrl}${separator}${params.toString()}`;

    const method = (req.method || 'GET').toUpperCase();
    const fetchOptions: RequestInit = {
      method,
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {});
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      res.status(response.ok ? 502 : response.status).json({
        success: false,
        error: 'Apps Script did not return JSON. Check Apps Script deployment permissions and code.',
        status: response.status,
        bodyPreview: text.slice(0, 500),
      });
      return;
    }

    res.status(response.ok ? 200 : response.status).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
