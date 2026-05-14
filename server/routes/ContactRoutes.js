const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const axios = require('axios');
const Contact = require('../models/Contact');


/* ─── Nodemailer transporter ──────────────────────────────── */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,   // your Gmail address
        pass: process.env.EMAIL_PASS,   // Gmail App Password (not your normal password)
    },
});

/* ─── Twilio WhatsApp client ──────────────────────────────── */


/* ════════════════════════════════════════════════════════════
   POST  /api/contact
   Saves the message, notifies admin via email + WhatsApp,
   and emits a real-time socket event to the admin panel.
════════════════════════════════════════════════════════════ */
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        /* ── 1. Validate ── */
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        /* ── 2. Save to MongoDB ── */
        const contact = await Contact.create({ name, email, subject, message });

        /* ── 3. Emit socket event → admin panel gets instant notification ── */
        const io = req.app.get('io');
        if (io) {
            io.emit('new_contact', {
                _id: contact._id,
                name,
                email,
                subject,
                message,
                status: contact.status,
                createdAt: contact.createdAt,
            });
        }

        /* ── 4. Send Email to admin ── */
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
          <p style="margin-top:20px;font-size:0.8rem;color:#7888a8;">Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        </div>
      </div>`;

        await transporter.sendMail({
            from: `"IDC Website" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,           // your admin email
            subject: `[IDC] New Message: ${subject} — from ${name}`,
            html: emailHtml,
        });

        /* ── 5. Send WhatsApp message via Twilio ── */
        const whatsappBody =
            `🏆 *New IDC Contact Message*\n\n` +
            `👤 *Name:* ${name}\n` +
            `📧 *Email:* ${email}\n` +
            `📌 *Subject:* ${subject}\n\n` +
            `💬 *Message:*\n${message}\n\n` +
            `🕐 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`;

        

        res.status(201).json({ success: true, message: 'Message sent successfully!' });
        console.log('Contact message saved and notifications sent.');

    } catch (err) {
        console.error('Contact route error:', err);
        res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
});

/* ════════════════════════════════════════════════════════════
   GET  /api/contact          — fetch all (admin panel)
   PATCH /api/contact/:id     — update status
   DELETE /api/contact/:id    — delete
════════════════════════════════════════════════════════════ */
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