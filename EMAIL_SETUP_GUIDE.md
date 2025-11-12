# Email Configuration Guide - HumanMetrix

## ✅ Email Improvements Applied

### 1. **Enhanced SMTP Configuration**
- ✅ Explicit Gmail SMTP settings (host: smtp.gmail.com, port: 587)
- ✅ TLS encryption enforced (`requireTLS: true`)
- ✅ Connection pooling for better performance
- ✅ Debug logging enabled in development mode
- ✅ SMTP connection verification on startup

### 2. **Better Error Handling & Logging**
- ✅ All email sends now log success with Message IDs
- ✅ Failed emails log detailed error messages
- ✅ Payment doesn't fail if email fails (graceful degradation)
- ✅ Console warnings upgraded to errors for visibility

### 3. **Production-Ready Features**
```javascript
// New configuration includes:
- Connection pooling (max 5 connections, 100 messages)
- Automatic SMTP verification
- Detailed SMTP debug logs
- Success/failure tracking with Message IDs
```

---

## 🔧 Required Gmail Setup

### **CRITICAL: You MUST use a Gmail App Password**

1. **Enable 2-Step Verification** on your Google account:
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate an App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Set Environment Secrets in Replit**:
   - `GMAIL_USER`: Your full Gmail address (e.g., `humanmetrix.sales@gmail.com`)
   - `GMAIL_APP_PASSWORD`: The 16-character App Password (no spaces!)

**❌ DO NOT use your regular Gmail password - it won't work!**

---

## 📊 How to Verify Emails Are Working

### On Server Startup:
Look for this in logs:
```
✅ SMTP Server ready to send emails
```

### When Emails Send:
Look for these in logs:
```
✅ Welcome email sent to oskar.greda@hotmail.co.uk (ID: <abc123@gmail.com>)
```

### If Emails Fail:
You'll see:
```
❌ SMTP Connection Error: [detailed error message]
✗ Failed to send welcome email to ...: [error details]
```

---

## 🐛 Troubleshooting

### **Email Not Received?**

1. **Check Spam Folder** - Gmail might filter it
2. **Check Server Logs** - Look for `✅ Welcome email sent` message
3. **Verify App Password** - Try regenerating it
4. **Check Gmail Account** - Make sure it's not locked or limited

### **SMTP Connection Failed?**

```
❌ SMTP Connection Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Fix:** Use an App Password, not your regular Gmail password

```
❌ SMTP Connection Error: Connection timeout
```
**Fix:** Check if Replit's server can access `smtp.gmail.com:587`

---

## 🔐 Security Best Practices

✅ **DO:**
- Use Gmail App Passwords (16 characters)
- Store credentials in Replit Secrets (encrypted)
- Enable 2-Step Verification on Gmail
- Monitor email logs for failures

❌ **DON'T:**
- Use regular Gmail passwords
- Hardcode credentials in code
- Share App Passwords
- Disable 2-Step Verification

---

## 📈 Future Improvements (Optional)

For production at scale, consider migrating to:
- **SendGrid** (12,000 free emails/month, better deliverability)
- **Mailgun** (5,000 free emails/month)
- **AWS SES** (62,000 free emails/month)

These services:
- Handle SPF/DKIM/DMARC automatically
- Provide delivery analytics
- Have better spam filtering
- Support higher volumes
- Offer better reliability

---

## 📝 Test Checklist

Before going live:
- [ ] Gmail App Password generated and added to secrets
- [ ] SMTP connection verified in logs (`✅ SMTP Server ready`)
- [ ] Test welcome email sent successfully
- [ ] Email received (check spam if not in inbox)
- [ ] Message ID logged in server logs
- [ ] Password reset emails working
- [ ] Invitation emails working

---

## Current Status

### ✅ Fixed Issues:
1. Purchase items now created with status "ready" (not "active")
2. Email sending wrapped in try-catch with detailed logging
3. SMTP connection verified on startup
4. Enhanced configuration for reliability

### 🔍 Next Steps:
1. Verify Gmail App Password is configured in production
2. Test complete checkout flow end-to-end
3. Monitor server logs for email send confirmations
4. Check recipient inbox/spam folder

---

**Last Updated:** November 12, 2025
