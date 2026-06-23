import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketHandlers, socketUserMap, userSocketMap } from './socketHandler';
import { matchmaker } from './matchmaker';
import { db } from './db';
import path from 'path';
import nodemailer from 'nodemailer';
import fs from 'fs';
import multer from 'multer';
import { verifyPayPalOrder, processPayPalCardPayment } from './paypal';
import crypto from 'crypto';

// Load environmental variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CORS setup
app.use(cors({
  origin: '*', // Allow all origins for dev testing
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Create directory for local uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded videos statically
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration preserving original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `bot-video-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max video limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed.'));
    }
  }
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[server] ${req.method} ${req.url}`);
  next();
});

// Development proxy for Next.js assets/pages from port 3001 to port 3000
app.use((req, res, next) => {
  const isApiOrSocket = req.path.startsWith('/api') || 
                        req.path.startsWith('/socket.io') || 
                        req.path === '/health';
  
  if (!isApiOrSocket) {
    const headers = { ...req.headers };
    headers.host = '127.0.0.1:3000';
    
    const proxyReq = http.request({
      host: '127.0.0.1',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    
    proxyReq.on('error', () => {
      // Next.js dev server is not running or offline, fallback to static serving from /out
      next();
    });
    
    req.pipe(proxyReq, { end: true });
  } else {
    next();
  }
});

// Serve static frontend files with disabled cache for HTML files
app.use(express.static(path.join(__dirname, '../../frontend/out'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[nodemailer] Using custom SMTP service.');
  } else {
    try {
      console.log('[nodemailer] Creating a temporary test email account...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      (transporter as any).isTestAccount = true;
      console.log(`[nodemailer] Temporary SMTP account created: ${testAccount.user}`);
    } catch (err) {
      console.error('[nodemailer] Failed to create test SMTP account:', err);
    }
  }

  return transporter;
}

async function sendActivationEmail(email: string, token: string, username: string) {
  const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/activate?token=${token}`;
  
  console.log(`\n==================================================`);
  console.log(`📧 ACTIVATION EMAIL FOR: ${email}`);
  console.log(`🔗 LINK: ${activationLink}`);
  console.log(`==================================================\n`);

  const activeTransporter = await getTransporter();
  if (activeTransporter) {
    try {
      const fromEmail = process.env.SMTP_FROM || 'noreply@lunaar.com';
      const info = await activeTransporter.sendMail({
        from: `"Lunaar" <${fromEmail}>`,
        to: email,
        subject: "Activate your Lunaar account",
        text: `Thank you for joining Lunaar. Please login now to activate your account: ${activationLink}`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; color: #333; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Logo Section -->
            <div style="margin-bottom: 28px;">
              <h1 style="color: #FF3B3B; font-size: 32px; font-weight: 900; letter-spacing: 4px; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">LUNAAR</h1>
              <a href="http://localhost:3000" style="color: #4A5568; text-decoration: none; font-size: 13px; font-weight: 500; font-family: monospace;">lunaar.com</a>
            </div>

            <!-- Content -->
            <div style="font-size: 16px; line-height: 1.6; color: #2D3748; margin-bottom: 32px; font-family: Arial, sans-serif;">
              <p style="margin: 0 0 12px 0;">Thank you for joining <a href="http://localhost:3000" style="color: #E53E3E; text-decoration: underline; font-weight: bold;">Lunaar</a>.</p>
              <p style="margin: 0;">Please <span style="font-weight: bold;">login now</span> to activate your account and get access to cool video chat features available to only members.</p>
            </div>

            <!-- Button -->
            <div style="margin-bottom: 32px;">
              <a href="${activationLink}" style="display: inline-block; background-color: #E53E3E; color: #ffffff; padding: 16px 48px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">LOGIN NOW</a>
            </div>
          </div>
        `,
      });

      console.log(`[nodemailer] Email sent! Message ID: ${info.messageId}`);
      if ((activeTransporter as any).isTestAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`🔗 [Nodemailer Preview] Open this link to see the email in a web inbox: ${previewUrl}`);
      }
    } catch (err) {
      console.error(`[nodemailer] Failed to send email:`, err);
    }
  }
}

async function sendWelcomeEmail(email: string, username: string) {
  const activeTransporter = await getTransporter();
  if (activeTransporter) {
    try {
      const fromEmail = process.env.SMTP_FROM || 'noreply@lunaar.com';
      const upgradeLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile?upgrade=true`;
      
      console.log(`\n==================================================`);
      console.log(`📧 SENDING WELCOME EMAIL TO: ${email}`);
      console.log(`==================================================\n`);

      const info = await activeTransporter.sendMail({
        from: `"Lunaar" <${fromEmail}>`,
        to: email,
        subject: "Registration Confirmed, Welcome to Lunaar!",
        text: `Thank you for joining Lunaar, your free registration has been confirmed! Upgrade to VIP to unlock all features.`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; color: #333; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
            <!-- Logo Section -->
            <div style="margin-bottom: 24px; display: inline-block;">
              <span style="font-size: 28px; font-weight: 800; letter-spacing: 4px; font-family: 'Arial Black', Gadget, sans-serif; color: #000000; text-transform: uppercase;">LUN<span style="color: #e52424;">AAR</span></span><span style="font-size: 14px; font-weight: bold; color: #718096; vertical-align: top; margin-left: 2px;">.com</span>
            </div>

            <!-- Header -->
            <h1 style="font-size: 26px; font-weight: 800; color: #1e293b; margin: 0 0 24px 0; font-family: Arial, sans-serif; letter-spacing: -0.5px; line-height: 1.2;">Registration Confirmed, Welcome to Lunaar!</h1>

            <!-- Content -->
            <div style="font-size: 15px; line-height: 1.6; color: #4A5568; margin-bottom: 28px; font-family: Arial, sans-serif; text-align: center; padding: 0 10px;">
              <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #1e293b; line-height: 1.4;">Thank you for joining Lunaar, your free registration has been confirmed.</h3>
              <p style="margin: 0; font-size: 14px; color: #4a5568; line-height: 1.6; max-width: 520px; margin-left: auto; margin-right: auto;">Meeting new people just got easier! Your free membership includes cool features such as face filters, auto translate and more. To unlock all available features including gender filter, private chat and safe search options upgrade to Lunaar VIP.</p>
            </div>

            <!-- Button & Subtext -->
            <div style="margin-bottom: 24px;">
              <div style="margin-bottom: 12px;">
                <a href="${upgradeLink}" style="display: inline-block; background-color: #e52424; color: #ffffff; padding: 14px 44px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase; font-family: Arial, sans-serif; letter-spacing: 0.5px;">UNLOCK ALL FEATURES</a>
              </div>
              <p style="margin: 0; font-size: 12px; color: #1a1a1a; font-weight: bold; font-family: Arial, sans-serif; letter-spacing: 0.5px;">Limited Time Only</p>
            </div>

            <!-- Dark Footer Bar -->
            <div style="background-color: #0c0813; height: 12px; width: 100%; margin-top: 36px; border-radius: 2px;"></div>
          </div>
        `,
      });

      console.log(`[nodemailer] Welcome email sent! Message ID: ${info.messageId}`);
      if ((activeTransporter as any).isTestAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`🔗 [Nodemailer Preview] Open this link to see the welcome email in a web inbox: ${previewUrl}`);
      }
    } catch (err) {
      console.error(`[nodemailer] Failed to send welcome email:`, err);
    }
  }
}

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ success: false, error: 'Please provide all required fields.' });
    return;
  }

  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    return;
  }

  const userId = `u_${Math.random().toString(36).substring(2, 11)}`;
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  db.createOrUpdateUser({
    id: userId,
    username,
    email,
    password,
    activated: false,
    activationToken: token,
    avatarUrl: `https://api.dicebear.com/7.x/lorelei/svg?seed=${username}`
  });

  await sendActivationEmail(email, token, username);

  res.json({ success: true, email });
});

// Resend activation endpoint
app.post('/api/resend-activation', async (req, res) => {
  const { oldEmail, newEmail } = req.body;
  if (!oldEmail) {
    res.status(400).json({ success: false, error: 'Missing old email.' });
    return;
  }

  const user = db.getUserByEmail(oldEmail);
  if (!user) {
    res.status(404).json({ success: false, error: 'No account found with this email.' });
    return;
  }

  if (user.activated) {
    res.status(400).json({ success: false, error: 'Account is already activated.' });
    return;
  }

  const targetEmail = newEmail || oldEmail;
  
  if (newEmail && newEmail.toLowerCase() !== oldEmail.toLowerCase()) {
    const existingUser = db.getUserByEmail(newEmail);
    if (existingUser) {
      res.status(400).json({ success: false, error: 'This email is already taken by another account.' });
      return;
    }
  }

  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  db.createOrUpdateUser({
    id: user.id,
    email: targetEmail,
    activationToken: token
  });

  await sendActivationEmail(targetEmail, token, user.username);

  res.json({ success: true, email: targetEmail });
});

// Activate endpoint
app.post('/api/activate', (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, error: 'Activation token is required.' });
    return;
  }

  const user = db.getUserByActivationToken(token);
  if (!user) {
    res.status(400).json({ success: false, error: 'Invalid or expired activation link.' });
    return;
  }

  const updatedUser = db.createOrUpdateUser({
    id: user.id,
    activated: true,
    activationToken: undefined
  });

  if (updatedUser.email) {
    sendWelcomeEmail(updatedUser.email, updatedUser.username).catch(err => {
      console.error('[nodemailer] Failed to send welcome email:', err);
    });
  }

  res.json({
    success: true,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      isPremium: updatedUser.isPremium
    }
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Please provide email and password.' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user || user.password !== password) {
    res.status(400).json({ success: false, error: 'Invalid email or password.' });
    return;
  }

  if (user.activated === false) {
    res.status(403).json({ success: false, error: 'PENDING_ACTIVATION', email: user.email });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isPremium: user.isPremium
    }
  });
});

// Basic check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// Platform Stats Endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    onlineCount: db.getOnlineCount(),
    activeMatches: matchmaker.getActiveMatchCount(),
    queueCount: matchmaker.getQueueSize(),
    dailyConversations: 248900 + matchmaker.getActiveMatchCount(),
    averageConnectionMs: 5200 // 5.2s average match time
  });
});

// Mock Image Upload (R2/S3 simulator)
app.post('/api/upload', (req, res) => {
  // Return a random beautiful avatar URL to simulate R2 storage
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200'
  ];
  const randomUrl = avatars[Math.floor(Math.random() * avatars.length)];
  res.json({ success: true, url: randomUrl });
});

// PayPal Order Verification and Account Upgrade
app.post('/api/payments/verify', async (req, res) => {
  const { orderId, plan, userId } = req.body;
  if (!orderId || !plan || !userId) {
    res.status(400).json({ success: false, error: 'orderId, plan, and userId are required.' });
    return;
  }

  // Fetch user profile from database
  let user = db.getUser(userId);
  if (!user) {
    console.log(`[Payment] User ${userId} not found in database. Registering guest profile...`);
    user = db.createOrUpdateUser({
      id: userId,
      username: `Stranger_${userId.substring(2, 8)}`,
      isPremium: false
    });
  }

  try {
    // Support mock card/GPay transaction IDs directly to bypass live PayPal check
    if (orderId.startsWith('CARD-MOCK-') || orderId.startsWith('GPAY-MOCK-')) {
      console.log(`[Payment] Mock transaction ${orderId} captured. Upgrading user...`);
      user.isPremium = true;
      db.createOrUpdateUser(user);

      // Notify user's socket connection of profile changes
      const socketId = userSocketMap.get(userId);
      if (socketId) {
        io.to(socketId).emit('profile_updated', user);
      }

      res.json({ success: true, user });
      return;
    }

    // If PayPal credentials are not configured, simulate payment capture for developer testing
    const isConfigured = process.env.PAYPAL_CLIENT_ID && 
                          process.env.PAYPAL_CLIENT_ID !== 'your-paypal-sandbox-client-id-here';

    if (!isConfigured) {
      console.log('[PayPal] Credentials not configured. Simulating payment capture for testing...');
      user.isPremium = true;
      db.createOrUpdateUser(user);

      // Notify user's socket connection of profile changes
      const socketId = userSocketMap.get(userId);
      if (socketId) {
        io.to(socketId).emit('profile_updated', user);
      }

      res.json({ success: true, user, warning: 'PAYPAL_SANDBOX_SIMULATED' });
      return;
    }

    // Verify order directly with PayPal API
    const order = await verifyPayPalOrder(orderId);
    
    // Ensure order state is APPROVED or COMPLETED
    if (order.status !== 'APPROVED' && order.status !== 'COMPLETED') {
      res.status(400).json({ success: false, error: `Invalid order status: ${order.status}` });
      return;
    }

    // Validate expected payment amount matches selected pass
    const expectedAmount = plan === 'week' ? '8.99' : '24.99';
    const amountVal = order.purchase_units[0]?.amount?.value;
    const currency = order.purchase_units[0]?.amount?.currency_code;

    if (amountVal !== expectedAmount || currency !== 'USD') {
      res.status(400).json({ 
        success: false, 
        error: `Payment amount or currency mismatch. Expected ${expectedAmount} USD, got ${amountVal} ${currency}` 
      });
      return;
    }

    // Upgrade user status in DB
    user.isPremium = true;
    db.createOrUpdateUser(user);

    // Sync state to current active websocket connection
    const socketId = userSocketMap.get(userId);
    if (socketId) {
      io.to(socketId).emit('profile_updated', user);
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('[PayPal] Payment verification failed:', error);
    res.status(500).json({ success: false, error: error.message || 'PayPal transaction verification failed.' });
  }
});

// PayPal Direct Card Payment Processing
app.post('/api/payments/process-card', async (req, res) => {
  const { 
    cardNumber, 
    expiryDate, 
    cvv, 
    cardholderName, 
    streetAddress, 
    city, 
    state, 
    postalCode, 
    countryCode, 
    plan, 
    userId 
  } = req.body;

  if (!cardNumber || !expiryDate || !cvv || !cardholderName || !streetAddress || !plan || !userId) {
    res.status(400).json({ success: false, error: 'Missing required card or billing information.' });
    return;
  }

  // Fetch user profile from database
  let user = db.getUser(userId);
  if (!user) {
    console.log(`[Payment] User ${userId} not found in database. Registering guest profile...`);
    user = db.createOrUpdateUser({
      id: userId,
      username: `Stranger_${userId.substring(2, 8)}`,
      isPremium: false
    });
  }

  const cleanCardNumber = cardNumber.replace(/\s/g, '');
  const isMock = process.env.PAYPAL_MODE !== 'live' && (
    cleanCardNumber.startsWith('12341234') || 
    cleanCardNumber.startsWith('41111111') || 
    !process.env.PAYPAL_CLIENT_ID || 
    process.env.PAYPAL_CLIENT_ID === 'your-paypal-sandbox-client-id-here'
  );

  if (isMock) {
    console.log(`[Payment] Processing mock card payment. Cardholder: ${cardholderName}. Upgrading user...`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    user.isPremium = true;
    db.createOrUpdateUser(user);

    // Notify user's socket connection of profile changes
    const socketId = userSocketMap.get(userId);
    if (socketId) {
      io.to(socketId).emit('profile_updated', user);
    }

    res.json({ success: true, user, warning: 'PAYPAL_SANDBOX_SIMULATED' });
    return;
  }

  try {
    // Expected amount based on plan choice
    const amount = plan === 'week' ? '8.99' : '24.99';

    // Parse expiry date from "MM / YY" to "YYYY-MM"
    const expiryParts = expiryDate.split('/');
    if (expiryParts.length !== 2) {
      res.status(400).json({ success: false, error: 'Invalid expiry date format. Expected MM / YY.' });
      return;
    }
    const month = expiryParts[0].trim();
    const year = `20${expiryParts[1].trim()}`;
    const formattedExpiry = `${year}-${month}`;

    const cardPayload = {
      number: cleanCardNumber,
      expiry: formattedExpiry,
      securityCode: cvv,
      name: cardholderName,
      streetAddress,
      city: city || 'City',
      state: state || 'State',
      postalCode: postalCode || '00000',
      countryCode: countryCode || 'US'
    };

    console.log(`[PayPal] Processing direct card payment for user ${userId}...`);
    const paymentResult = await processPayPalCardPayment(cardPayload, amount);

    if (!paymentResult.success) {
      res.status(400).json({ success: false, error: paymentResult.error || 'Card processing rejected by PayPal.' });
      return;
    }

    // Upgrade user status in DB
    user.isPremium = true;
    db.createOrUpdateUser(user);

    // Sync state to current active websocket connection
    const socketId = userSocketMap.get(userId);
    if (socketId) {
      io.to(socketId).emit('profile_updated', user);
    }

    console.log(`[PayPal] Card payment successful for user ${userId}, upgraded to VIP status.`);
    res.json({ success: true, user, orderId: paymentResult.orderId });
  } catch (error: any) {
    console.error('[PayPal] Direct card payment failed:', error);
    res.status(500).json({ success: false, error: error.message || 'PayPal transaction card processing failed.' });
  }
});

// Next.js client-side route mapping fallback
app.get('/chat', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/chat.html'));
});

app.get('/friends', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/friends.html'));
});

app.get('/profile', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/profile.html'));
});

app.get('/upgrade', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/upgrade.html'));
});

app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/admin.html'));
});

app.get('/terms', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/terms.html'));
});

app.get('/privacy', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/privacy.html'));
});

app.get('/abuse', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/abuse.html'));
});

app.get('/billing-support', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/billing-support.html'));
});

app.get('/contact', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/contact.html'));
});
// --- ADMIN API ENDPOINTS ---

// Active Admin Session Tokens Store (In-Memory)
const activeAdminSessions = new Set<string>();

// Admin Authentication Middleware
const adminAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized access. No token provided.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!activeAdminSessions.has(token)) {
    res.status(401).json({ success: false, error: 'Unauthorized access. Invalid or expired token.' });
    return;
  }
  next();
};

// Admin Login Route (No Auth required)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === correctPassword) {
    const token = crypto.randomBytes(32).toString('hex');
    activeAdminSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid Administrator Security Password.' });
  }
});

// Admin Logout Route (Clears active session token)
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeAdminSessions.delete(token);
  }
  res.json({ success: true });
});

// Lock down all administrative endpoints below
app.use('/api/admin', adminAuthMiddleware);

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const users = db.getAllUsers();
  const reports = (db as any).reports || [];
  res.json({
    totalUsers: users.length,
    vipUsers: users.filter(u => u.isPremium).length,
    activeConnections: userSocketMap.size,
    activeMatches: matchmaker.getActiveMatchCount(),
    queueCount: matchmaker.getQueueSize(),
    totalReports: reports.length,
    unresolvedReports: reports.length
  });
});

// Admin Users List
app.get('/api/admin/users', (req, res) => {
  const users = db.getAllUsers();
  const usersWithOnlineStatus = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    interests: user.interests,
    gender: user.gender,
    country: user.country,
    isPremium: user.isPremium,
    createdAt: user.createdAt,
    isOnline: userSocketMap.has(user.id)
  }));
  res.json(usersWithOnlineStatus);
});

// Admin Toggle VIP Status
app.post('/api/admin/users/:id/vip', (req, res) => {
  const { id } = req.params;
  const user = db.getUser(id);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }
  user.isPremium = !user.isPremium;
  db.createOrUpdateUser(user);
  
  // Notify client if online
  const socketId = userSocketMap.get(id);
  if (socketId) {
    io.to(socketId).emit('profile_updated', user);
  }
  
  res.json({ success: true, user });
});

// Admin Ban User (Deletes from DB & Disconnects)
app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;

  if (id && id.startsWith('sim_')) {
    res.json({ success: true });
    return;
  }

  const user = db.getUser(id);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }

  // Terminate matching/queue if active
  matchmaker.removeFromQueue(id);
  
  // Terminate active socket
  const socketId = userSocketMap.get(id);
  if (socketId) {
    matchmaker.endActiveMatch(socketId);
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('error', { message: 'Your account has been banned by an administrator.' });
      socket.disconnect(true);
    }
  }

  // Delete from database
  (db as any).users.delete(id);

  res.json({ success: true });
});

// Admin Reports List
app.get('/api/admin/reports', (req, res) => {
  const reports = (db as any).reports || [];
  const detailedReports = reports.map((r: any) => {
    const reporter = db.getUser(r.reporterId);
    
    let reportedName = 'Unknown';
    if (r.reportedId && r.reportedId.startsWith('sim_')) {
      const botNameMap: Record<string, string> = {
        'sim_yuki': 'Yuki_K (Bot)',
        'sim_sophia': 'Sophia_Globe (Bot)',
        'sim_alex': 'AlexTech (Bot)'
      };
      reportedName = botNameMap[r.reportedId] || 'Simulated Bot';
    } else {
      const reported = db.getUser(r.reportedId);
      reportedName = reported?.username || 'Unknown';
    }

    return {
      ...r,
      reporterName: reporter?.username || 'Unknown',
      reportedName
    };
  });
  res.json(detailedReports);
});

// Admin Resolve Report (Dismisses it)
app.post('/api/admin/reports/:id/resolve', (req, res) => {
  const { id } = req.params;
  const reports = (db as any).reports || [];
  const index = reports.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    reports.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Report not found.' });
  }
});

// Admin Active Sockets List
app.get('/api/admin/sockets', (req, res) => {
  const activeSockets: any[] = [];
  
  for (const [socketId, userId] of socketUserMap.entries()) {
    const user = db.getUser(userId);
    const partnerSocketId = matchmaker.getPartnerSocketId(socketId);
    const partnerUserId = partnerSocketId ? socketUserMap.get(partnerSocketId) : null;
    const partner = partnerUserId ? db.getUser(partnerUserId) : null;
    
    let state = 'Idle';
    if (partner) {
      state = `In Match with ${partner.username}`;
    } else if (matchmaker.getQueueDetails().some(q => q.userId === userId)) {
      state = 'In Matchmaking Queue';
    }
    
    activeSockets.push({
      socketId,
      userId,
      username: user?.username || 'Stranger',
      country: user?.country || 'Unknown',
      isPremium: user?.isPremium || false,
      state
    });
  }
  
  res.json(activeSockets);
});

// Admin Upload Video for Bots
app.post('/api/admin/bots/upload-video', (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No video file provided.' });
      return;
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, videoUrl: relativeUrl });
  });
});

// Admin Get Video Bots List
app.get('/api/admin/bots', (req, res) => {
  res.json(db.getVideoBots());
});

// Admin Add Video Bot
app.post('/api/admin/bots', (req, res) => {
  const { 
    username, gender, country, bio, interests, videoUrl, 
    chatEnabled, chatMessages, isPremium, 
    skipAfterDuration, skipDurationSeconds, skipNearEnd 
  } = req.body;
  
  if (!videoUrl) {
    res.status(400).json({ success: false, error: 'Video URL is required.' });
    return;
  }

  // Handle auto-generation of names/countries if requested or empty
  const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Australia', 'Japan', 'Brazil'];
  const maleNames = ['Alex', 'Liam', 'Noah', 'Ethan', 'Oliver', 'Mateo', 'Lucas', 'Mason', 'Jack', 'James'];
  const femaleNames = ['Sophia', 'Emma', 'Olivia', 'Ava', 'Isabella', 'Mia', 'Yuki', 'Charlotte', 'Amelia', 'Harper'];

  const botGender = gender === 'male' || gender === 'female' ? gender : (Math.random() > 0.5 ? 'male' : 'female');
  
  let botName = username;
  if (!botName || botName.trim() === '') {
    const list = botGender === 'male' ? maleNames : femaleNames;
    const randomName = list[Math.floor(Math.random() * list.length)];
    botName = `${randomName}_${Math.floor(100 + Math.random() * 900)} (Bot)`;
  }

  let botCountry = country;
  if (!botCountry || botCountry.trim() === '' || botCountry === 'World') {
    botCountry = countries[Math.floor(Math.random() * countries.length)];
  }

  const newBot = {
    id: `sim_${Math.random().toString(36).substring(2, 11)}`,
    username: botName,
    avatarUrl: `https://images.unsplash.com/photo-${botGender === 'male' ? '1507003211169-0a1dd7228f2d' : '1534528741775-53994a69daeb'}?w=150`,
    bio: bio || 'Let’s hang out and chat! 🎥',
    gender: botGender,
    country: botCountry,
    interests: Array.isArray(interests) ? interests : [],
    videoUrl,
    createdAt: new Date(),
    chatEnabled: typeof chatEnabled === 'boolean' ? chatEnabled : false,
    chatMessages: Array.isArray(chatMessages) ? chatMessages.map((m: any) => ({
      text: String(m.text || '').trim(),
      delay: Math.max(0, Number(m.delay || 0))
    })).filter((m: any) => m.text !== '') : [],
    isPremium: typeof isPremium === 'boolean' ? isPremium : false,
    skipAfterDuration: typeof skipAfterDuration === 'boolean' ? skipAfterDuration : false,
    skipDurationSeconds: Math.max(1, Number(skipDurationSeconds || 30)),
    skipNearEnd: typeof skipNearEnd === 'boolean' ? skipNearEnd : false
  };

  db.addVideoBot(newBot);
  res.json({ success: true, bot: newBot });
});

// Admin Delete Video Bot
app.delete('/api/admin/bots/:id', (req, res) => {
  const { id } = req.params;
  const success = db.deleteVideoBot(id);
  res.json({ success });
});

// Public Endpoint to retrieve current video bot pool based on user tier
app.get('/api/bots', (req, res) => {
  const { userId, isPremium } = req.query;
  const user = userId ? db.getUser(String(userId)) : undefined;
  const isPremiumUser = (user ? user.isPremium : false) || isPremium === 'true';
  
  const allBots = db.getVideoBots();
  // Premium users get Premium bots, Free users get General bots
  const filteredBots = allBots.filter(bot => {
    const botIsPremium = bot.isPremium === true;
    return isPremiumUser ? botIsPremium : !botIsPremium;
  });
  res.json(filteredBots);
});

// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'active', service: 'Lunaar Backend API' });
});

// Wildcard fallback
app.get('*', (req, res) => {
  // Prevent falling back to index.html for static assets, API paths, or files with extensions
  const isStaticOrApi = req.path.startsWith('/_next') || 
                        req.path.startsWith('/api') || 
                        path.extname(req.path) !== '';
  if (isStaticOrApi) {
    res.status(404).send('Not Found');
    return;
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../../frontend/out/index.html'));
});

const server = http.createServer(app);

// Socket.IO Server configuration with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000
});

// Bind Socket handlers
setupSocketHandlers(io);

server.listen(port, () => {
  console.log(`=========================================`);
  console.log(` Lunaar Backend Server running on port ${port}`);
  console.log(` WebSocket server signaling is active`);
  console.log(`=========================================`);
});
