import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let _transporter: Transporter | null = null;
export let isEthereal = false;
export let fromAddress = 'noreply@ticketbooking.com';

export async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  const smtpUser = process.env['SMTP_USER'];
  const usePlaceholder = !smtpUser || smtpUser === 'user' || smtpUser === '<smtp-username>';

  if (usePlaceholder) {
    const testAccount = await nodemailer.createTestAccount();
    isEthereal = true;
    fromAddress = testAccount.user;
    console.log('📧 Ethereal test email active — preview at https://ethereal.email');
    console.log('   Ethereal user:', testAccount.user);
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  } else {
    fromAddress = smtpUser;
    const cleanPass = (process.env['SMTP_PASS'] ?? '').replace(/\s+/g, '');
    const isGmail = (process.env['SMTP_HOST'] ?? '').includes('gmail') || smtpUser.endsWith('@gmail.com');

    if (isGmail) {
      _transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: cleanPass,
        },
      });
      console.log(`📧 Gmail SMTP active — sending from ${smtpUser}`);
    } else {
      _transporter = nodemailer.createTransport({
        host: process.env['SMTP_HOST'] ?? 'smtp.gmail.com',
        port: parseInt(process.env['SMTP_PORT'] ?? '465'),
        secure: parseInt(process.env['SMTP_PORT'] ?? '465') === 465,
        auth: { user: smtpUser, pass: cleanPass },
      });
    }
  }

  return _transporter;
}
