const nodemailer = require("nodemailer");

let transporter;

const readEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const getEmailConfig = () => {
  const host = readEnv("SMTP_HOST", "MAIL_HOST", "EMAIL_HOST");
  const portRaw = readEnv("SMTP_PORT", "MAIL_PORT", "EMAIL_PORT");
  const user = readEnv("SMTP_USER", "MAIL_USER", "EMAIL_USER");
  const pass = readEnv("SMTP_PASS", "MAIL_PASS", "EMAIL_PASS");
  const secureRaw = readEnv("SMTP_SECURE", "MAIL_SECURE", "EMAIL_SECURE");
  const from =
    readEnv("SMTP_FROM", "MAIL_FROM", "EMAIL_FROM") ||
    user ||
    "no-reply@chaldal.local";

  const port = Number(portRaw);
  const secure =
    String(secureRaw || "").toLowerCase() === "true" || String(port) === "465";

  const missing = [];

  if (!host) {
    missing.push("SMTP_HOST|MAIL_HOST|EMAIL_HOST");
  }

  if (!portRaw || Number.isNaN(port)) {
    missing.push("SMTP_PORT|MAIL_PORT|EMAIL_PORT");
  }

  if (!user) {
    missing.push("SMTP_USER|MAIL_USER|EMAIL_USER");
  }

  if (!pass) {
    missing.push("SMTP_PASS|MAIL_PASS|EMAIL_PASS");
  }

  return {
    host,
    port,
    user,
    pass,
    secure,
    from,
    missing,
  };
};

const isEmailConfigured = () => getEmailConfig().missing.length === 0;

const getTransporter = () => {
  const config = getEmailConfig();

  if (!isEmailConfigured()) {
    return { mailTransporter: null, config };
  }

  if (transporter) {
    return { mailTransporter: transporter, config };
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return { mailTransporter: transporter, config };
};

exports.sendEmail = async ({ to, subject, text, html }) => {
  const { mailTransporter, config } = getTransporter();

  if (!mailTransporter) {
    return {
      sent: false,
      skipped: true,
      reason: "mail-config-missing",
      missing: config.missing,
    };
  }

  try {
    await mailTransporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: "transport-error",
      error: error.message,
    };
  }
};

exports.getEmailConfig = getEmailConfig;
exports.isEmailConfigured = isEmailConfigured;
