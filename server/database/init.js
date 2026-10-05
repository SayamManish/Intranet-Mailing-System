const db = require('./db');

function initDatabase() {
  console.log('🔄 Initializing SQLite database tables and indices...');

  db.exec(`
    -- USERS TABLE
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      profile_image TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

    -- FOLDERS TABLE
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#4f46e5',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);

    -- EMAILS TABLE
    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      parent_email_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
      is_draft INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender_id);
    CREATE INDEX IF NOT EXISTS idx_emails_parent ON emails(parent_email_id);

    -- EMAIL RECIPIENTS TABLE
    CREATE TABLE IF NOT EXISTS email_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('to', 'cc', 'bcc')),
      is_read INTEGER DEFAULT 0,
      read_at TEXT,
      is_starred INTEGER DEFAULT 0,
      is_important INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recipients_email ON email_recipients(email_id);
    CREATE INDEX IF NOT EXISTS idx_recipients_user ON email_recipients(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_recipients_folder ON email_recipients(folder_id);

    -- EMAIL SENDER METADATA TABLE (Sender's view of sent emails/drafts)
    CREATE TABLE IF NOT EXISTS email_sender_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_starred INTEGER DEFAULT 0,
      is_important INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      UNIQUE(email_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sender_meta_email ON email_sender_metadata(email_id);
    CREATE INDEX IF NOT EXISTS idx_sender_meta_user ON email_sender_metadata(user_id);

    -- ATTACHMENTS TABLE
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_email ON attachments(email_id);

    -- CONTACTS TABLE
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nickname TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, contact_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);

    -- CHAT CONVERSATIONS TABLE
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- CHAT PARTICIPANTS TABLE
    CREATE TABLE IF NOT EXISTS chat_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT DEFAULT (datetime('now')),
      last_read_at TEXT DEFAULT (datetime('now')),
      UNIQUE(conversation_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_participants_conv ON chat_participants(conversation_id);

    -- CHAT MESSAGES TABLE
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);

    -- NOTIFICATIONS TABLE
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  console.log('✅ SQLite schema initialized successfully.');
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
