const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const Contact    = require('../models/Contact');


/* =========================
   NODEMAILER — Gmail
   Port 465 + SSL.
   Render blocks 587 STARTTLS
   but 465 SSL works.
========================= */

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:    465,
  secure:  true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});


/* ════════════════════════════
   POST  /api/contact
════════════════════════════ */

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    /* ── 1. Validate ── */
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    /* ── 2. Save to MongoDB ── */
    const contact = await Contact.create({ name, email, subject, message });

    /* ── 3. Socket event → admin panel ── */
    const io = req.app.get('io');
    if (io) {
      io.emit('new_contact', {
        _id:       contact._id,
        name, email, subject, message,
        status:    contact.status,
        createdAt: contact.createdAt,
      });
    }

    /* ── 4. Respond immediately ── */
    res.status(201).json({ success: true, message: 'Message sent successfully!' });

    /* ── 5. Send email (after response — non-blocking) ── */
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d0d1c;color:#e2e8f8;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#ff1500,#c8972a);padding:20px 30px;">
          <h1 style="margin:0;color:#fff;font-size:1.4rem;letter-spacing:0.1em;">📬 NEW IDC CONTACT MESSAGE</h1>
        </div>
        <div style="padding:28px 30px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#c8972a;font-weight:bold;width:100px;">Name</td><td style="padding:10px 0;">${name}</td></tr>
            <tr><td style="padding:10px 0;color:#c8972a;font-weight:bold;">Email</td><td style="padding:10px 0;"><a href="mailto:${email}" style="color:#ff8c00;">${email}</a></td></tr>
            <tr><td style="padding:10px 0;color:#c8972a;font-weight:bold;">Subject</td><td style="padding:10px 0;">${subject}</td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:rgba(255,255,255,0.05);border-left:3px solid #c8972a;border-radius:6px;">
            <p style="margin:0;line-height:1.7;">${message.replace(/\n/g, '<br/>')}</p>
          </div>
          <p style="margin-top:20px;font-size:0.8rem;color:#7888a8;">
            Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          </p>
        </div>
      </div>`;

    transporter.sendMail({
      from:    `"IDC Website" <${process.env.EMAIL_USER}>`,
      to:       process.env.ADMIN_EMAIL,
      subject: `[IDC] New Message: ${subject} — from ${name}`,
      html:    emailHtml,
    }).then(() => {
      console.log('✅ Email notification sent');
    }).catch((err) => {
      console.warn('Email send failed:', err.message);
    });

  } catch (err) {
    console.error('Contact route error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});


/* ════════════════════════════
   GET    /api/contact
   PATCH  /api/contact/:id
   DELETE /api/contact/:id
════════════════════════════ */

router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;