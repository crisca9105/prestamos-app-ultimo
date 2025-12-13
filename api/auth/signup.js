// API: POST /api/auth/signup
// User signup with Supabase authentication

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user data from request body
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Email, password, and full name are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Invalid password',
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Supabase configuration missing',
        message: 'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: full_name,
          email: email
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
      return res.status(400).json({ 
        error: 'Signup failed',
        message: error.message 
      });
    }

    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'Signup successful! Please check your email to confirm your account.',
      user: data.user 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}