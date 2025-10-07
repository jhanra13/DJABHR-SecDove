# SecDove Backup System - Quick Start Guide

## 🚀 What Changed?

Your SecDove app now has a comprehensive backup system that solves the message persistence problem!

### The Problem We Solved

With end-to-end encryption, **senders cannot decrypt their own sent messages** because messages are encrypted with the recipient's public key. This means:
- ❌ Sent messages couldn't be displayed to the sender
- ❌ Messages were lost when clearing browser data
- ❌ No way to move messages between devices

### The Solution

1. **IndexedDB Storage:** Sent messages are stored locally in plain text (only visible to you)
2. **PIN-Encrypted Backups:** Create encrypted backups to restore messages after clearing browser data or on new devices

## 📋 Quick Reference

### Create a Backup

1. Click **Settings** (⚙️) in sidebar
2. Click **"Manage Backups"**
3. Enter a PIN (min 4 characters)
4. Click **"Create Backup"**
5. Save the JSON file

### Restore a Backup

1. Click **Settings** (⚙️) in sidebar
2. Click **"Manage Backups"**
3. Click **"Restore"** tab
4. Upload your backup JSON file
5. Enter your PIN
6. Click **"Restore Backup"**

## 🔧 New Files Created

```
client/src/
├── utils/
│   ├── messageStorage.js      # IndexedDB operations
│   └── messageBackup.js        # Backup/restore with PIN encryption
├── components/
│   ├── Modals/
│   │   ├── BackupModal.jsx    # Backup UI
│   │   └── BackupModal.css
│   └── Settings/
│       ├── SettingsView.jsx   # Settings page
│       └── SettingsView.css
└── hooks/
    └── useMessages.js          # Updated to use IndexedDB
```

## 🔑 Key Features

### 1. IndexedDB Storage
- **Capacity:** 50MB+ (vs 5-10MB with localStorage)
- **Persistence:** Survives browser restarts
- **Performance:** Asynchronous, indexed queries
- **Limitation:** Deleted when clearing browser data

### 2. PIN-Encrypted Backups
- **Encryption:** AES-256-GCM
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Format:** Downloadable JSON file
- **Portability:** Works on any device

### 3. User Interface
- **Settings Page:** Access all backup features
- **Storage Stats:** See how many messages stored
- **Two-Tab Interface:** Separate backup and restore workflows
- **Clear Messages:** Remove all local messages with confirmation

## ⚠️ Important Notes

### Security
- ✅ Backups are encrypted with your PIN
- ✅ Only you can decrypt your backups
- ⚠️ Sent messages stored in plain text locally
- ⚠️ Anyone with browser access can read messages
- ⚠️ Weak PINs can be cracked

**Recommendation:** Use strong PINs (8+ characters with symbols)

### Storage
- Messages persist across browser restarts
- Messages **DO NOT** persist after clearing browser data
- **Always create backups** before clearing browser data
- Backup files can be stored anywhere (cloud, USB, etc.)

### Compatibility
- ✅ Chrome/Edge/Brave
- ✅ Firefox
- ✅ Safari
- ✅ All modern browsers with IndexedDB support

## 🧪 Testing the System

### Test 1: Send and View Messages
1. Login to your account
2. Send a message to a contact
3. Message should appear immediately
4. Refresh the page
5. ✅ Message should still be there

### Test 2: Create and Restore Backup
1. Send a few test messages
2. Go to Settings → Manage Backups
3. Create a backup with PIN "test1234"
4. Note the number of messages backed up
5. Go to Restore tab
6. Upload the backup file
7. Enter PIN "test1234"
8. Click Restore
9. ✅ Messages should be restored

### Test 3: Clear and Restore
1. Create a backup first!
2. Go to Settings → Manage Backups
3. Click "Clear All Messages" (Danger Zone)
4. Confirm both prompts
5. Messages should be gone
6. Restore from backup
7. ✅ Messages should return

## 📊 Storage Statistics

View your storage usage:
1. Go to Settings
2. See "Local Storage" section
3. Shows:
   - Number of messages stored
   - Storage space used
   - Click "Refresh Stats" to update

## 🐛 Troubleshooting

### Messages Not Appearing
- Check console for errors (F12)
- Verify you're logged in
- Try refreshing the page
- Check if messages are in IndexedDB (DevTools → Application → IndexedDB)

### Backup/Restore Fails
- Verify PIN is correct (case-sensitive)
- Check backup file is valid JSON
- Ensure file isn't corrupted
- Try creating a new backup

### "Content Not Available" Message
This appears when:
- Message not in IndexedDB
- IndexedDB failed to save
- Message sent before implementing this system

**Solution:** Messages sent after this update will be stored properly

## 💡 Best Practices

### Regular Backups
- Backup weekly if you message frequently
- Backup before clearing browser data
- Keep backups in multiple locations
- Name backup files clearly: `secdove-backup-2025-10-06.json`

### PIN Management
- Use unique PINs for each backup
- Don't share your PIN
- Store PIN securely (password manager)
- Don't use obvious PINs (1234, password, etc.)

### Storage Management
- Monitor storage usage in Settings
- Clear old messages after backing up
- Keep only recent conversations locally
- Older messages can be in backup files only

## 🔄 Migration from Old System

If you used SecDove before this update:

**Old messages stored in localStorage are NOT automatically migrated.**

To preserve them:
1. They will continue to work temporarily
2. Create your first backup soon
3. Old localStorage entries will eventually be cleared
4. All new messages use IndexedDB

## 📱 Mobile vs Desktop

### Desktop Browsers
- ✅ Full IndexedDB support
- ✅ Large storage quotas
- ✅ Easy backup file management

### Mobile Browsers
- ✅ IndexedDB works on iOS Safari, Chrome Android
- ⚠️ Smaller storage quotas
- ⚠️ File management more difficult
- 💡 Use cloud storage for backup files

## 🎯 Next Steps

1. **Test the system:**
   - Send a few messages
   - Create a test backup
   - Try restoring it

2. **Understand the limits:**
   - Messages stored locally only
   - No automatic cloud sync
   - Requires manual backups

3. **Establish a backup routine:**
   - Weekly backups for active users
   - Before major browser maintenance
   - When switching devices

4. **Secure your backups:**
   - Use strong PINs
   - Store files securely
   - Don't lose your PIN!

## 📞 Support

If you encounter issues:
1. Check browser console (F12)
2. Review this guide
3. Check BACKUP_SYSTEM.md for technical details
4. File an issue with error messages

## ✅ Checklist

Before you start using the system:

- [ ] Understand that sent messages are stored locally
- [ ] Know how to create a backup
- [ ] Know how to restore a backup
- [ ] Have chosen a secure PIN
- [ ] Have a secure place to store backup files
- [ ] Tested backup and restore once
- [ ] Understand messages are lost if browser data cleared without backup

---

**You're all set! Start messaging securely with peace of mind knowing you can backup and restore your messages anytime.** 🎉
