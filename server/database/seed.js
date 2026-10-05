const db = require('./db');
const initDatabase = require('./init');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

async function seedDatabase() {
  initDatabase();
  console.log('🌱 Seeding database with realistic intranet data...');

  // Ensure uploads directory exists
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Clear existing data in correct FK order
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM chat_messages;
    DELETE FROM chat_participants;
    DELETE FROM chat_conversations;
    DELETE FROM contacts;
    DELETE FROM attachments;
    DELETE FROM email_sender_metadata;
    DELETE FROM email_recipients;
    DELETE FROM emails;
    DELETE FROM folders;
    DELETE FROM users;
  `);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (employee_id, name, email, password_hash, department, designation, profile_image, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const users = [
    { empId: 'EMP-001', name: 'System Administrator', email: 'admin@organization.local', dept: 'IT & Infrastructure', desig: 'Lead System Architect', role: 'admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { empId: 'EMP-002', name: 'Alice Walker', email: 'alice@organization.local', dept: 'Cyber Security Lab', desig: 'Senior Security Analyst', role: 'user', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { empId: 'EMP-003', name: 'Bob Smith', email: 'bob@organization.local', dept: 'Network Operations', desig: 'Network Infrastructure Engineer', role: 'user', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { empId: 'EMP-004', name: 'Charlie Davis', email: 'charlie@organization.local', dept: 'Software Engineering', desig: 'Full-Stack Developer', role: 'user', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { empId: 'EMP-005', name: 'David Evans', email: 'david@organization.local', dept: 'Information Security', desig: 'Incident Response Officer', role: 'user', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
    { empId: 'EMP-006', name: 'Emma Watson', email: 'emma@organization.local', dept: 'Quality Assurance', desig: 'QA & Compliance Manager', role: 'user', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' }
  ];

  const userIds = {};
  for (const u of users) {
    const res = insertUser.run(u.empId, u.name, u.email, passwordHash, u.dept, u.desig, u.avatar, u.role);
    userIds[u.email] = res.lastInsertRowid;
  }

  // 2. Insert Custom Folders
  const insertFolder = db.prepare(`
    INSERT INTO folders (user_id, name, color)
    VALUES (?, ?, ?)
  `);

  const folderAliceSec = insertFolder.run(userIds['alice@organization.local'], 'Security Audits', '#ef4444').lastInsertRowid;
  const folderAliceProj = insertFolder.run(userIds['alice@organization.local'], 'LAN Migration', '#3b82f6').lastInsertRowid;
  const folderBobNet = insertFolder.run(userIds['bob@organization.local'], 'Firewall Logs', '#10b981').lastInsertRowid;
  const folderAdminOps = insertFolder.run(userIds['admin@organization.local'], 'System Governance', '#8b5cf6').lastInsertRowid;

  // 3. Create Sample Sample Attachment Files in uploads
  const samplePolicyFile = 'security_policy_v2.pdf';
  const samplePolicyPath = path.join(uploadsDir, samplePolicyFile);
  fs.writeFileSync(samplePolicyPath, 'INTERNAL ORGANIZATIONAL POLICY DOCUMENT:\nAll communications must strictly remain inside the intranet boundary. Unauthorized tunneling is prohibited.');

  const sampleArchDiag = 'lan_architecture_diagram.txt';
  const sampleArchPath = path.join(uploadsDir, sampleArchDiag);
  fs.writeFileSync(sampleArchPath, 'SUBNET 192.168.1.0/24 TOPOLOGY:\nCore Switch -> Department VLANs -> Airgapped Gateway');

  // Helper to send emails in seed
  const insertEmail = db.prepare(`
    INSERT INTO emails (sender_id, subject, body, parent_email_id, is_draft, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertRecipient = db.prepare(`
    INSERT INTO email_recipients (email_id, recipient_id, type, is_read, read_at, is_starred, is_important, is_deleted, is_archived, folder_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `);

  const insertSenderMeta = db.prepare(`
    INSERT INTO email_sender_metadata (email_id, user_id, is_starred, is_important, is_deleted, is_archived, folder_id)
    VALUES (?, ?, ?, ?, 0, 0, ?)
  `);

  const insertAttachment = db.prepare(`
    INSERT INTO attachments (email_id, original_name, stored_name, file_path, mime_type, file_size)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Email 1: Welcome from Admin to Alice
  const e1 = insertEmail.run(
    userIds['admin@organization.local'],
    'Welcome to the Intranet Mailing & Communication Network',
    `<p>Hello Alice,</p>
    <p>Welcome to our organization's private intranet portal. This platform provides isolated, high-speed, and secure peer-to-peer internal mailing and real-time collaboration across our LAN subnets.</p>
    <p><strong>Key Guidelines:</strong></p>
    <ul>
      <li>All emails and file transfers are strictly confined to registered organization members.</li>
      <li>External domains cannot be reached from this platform for cybersecurity compliance.</li>
      <li>Use the integrated realtime chat for quick peer collaboration.</li>
    </ul>
    <p>Please review the attached security framework document.</p>
    <p>Best regards,<br/><strong>IT & Infrastructure Security Team</strong></p>`,
    null,
    0,
    '-2 days'
  ).lastInsertRowid;

  insertRecipient.run(e1, userIds['alice@organization.local'], 'to', 1, new Date().toISOString(), 1, 1, null);
  insertSenderMeta.run(e1, userIds['admin@organization.local'], 0, 1, folderAdminOps);
  insertAttachment.run(e1, 'Security_Policy_v2.pdf', samplePolicyFile, samplePolicyPath, 'application/pdf', 145000);

  // Email 2: Bob to Alice regarding LAN Gateway upgrade
  const e2 = insertEmail.run(
    userIds['bob@organization.local'],
    'LAN Gateway Migration & Subnet 192.168.1.0/24 Verification',
    `<p>Hi Alice,</p>
    <p>We are scheduling the routine routing test on our core switch tonight. All workstations on the <code>192.168.1.0/24</code> subnet will maintain active connection to this intranet server.</p>
    <p>Let me know if the Cyber Security team needs any customized port monitoring or rate limiting exemptions during testing.</p>
    <p>Thanks,<br/>Bob Smith</p>`,
    null,
    0,
    '-1 days'
  ).lastInsertRowid;

  insertRecipient.run(e2, userIds['alice@organization.local'], 'to', 0, null, 1, 0, folderAliceProj);
  insertSenderMeta.run(e2, userIds['bob@organization.local'], 0, 0, folderBobNet);
  insertAttachment.run(e2, 'LAN_Architecture_Diagram.txt', sampleArchDiag, sampleArchPath, 'text/plain', 4200);

  // Email 3: Alice replying to Bob (Threaded)
  const e3 = insertEmail.run(
    userIds['alice@organization.local'],
    'Re: LAN Gateway Migration & Subnet 192.168.1.0/24 Verification',
    `<p>Hi Bob,</p>
    <p>Thanks for the heads-up. The Cyber Security team has reviewed the schedule. Please ensure that port 5000 (Backend API & WebSockets) and 5173 (Vite Intranet Web Portal) remain fully responsive across all departmental switches.</p>
    <p>I will monitor live packet flow from our terminal.</p>
    <p>Regards,<br/>Alice</p>`,
    e2,
    0,
    '-18 hours'
  ).lastInsertRowid;

  insertRecipient.run(e3, userIds['bob@organization.local'], 'to', 1, new Date().toISOString(), 0, 0, null);
  insertSenderMeta.run(e3, userIds['alice@organization.local'], 0, 0, folderAliceProj);

  // Email 4: Charlie to Alice (Code Review for Intranet Module)
  const e4 = insertEmail.run(
    userIds['charlie@organization.local'],
    'Code Review: Parameterized SQLite Queries & IDOR Prevention',
    `<p>Hey Alice,</p>
    <p>I have completed the security review on the internal mail routing controllers. All queries use strictly parameterized statements with better-sqlite3 and ownership verification at the middleware layer.</p>
    <p>Looking forward to your final sign-off before we deploy to production.</p>
    <p>Cheers,<br/>Charlie Davis</p>`,
    null,
    0,
    '-4 hours'
  ).lastInsertRowid;

  insertRecipient.run(e4, userIds['alice@organization.local'], 'to', 0, null, 0, 1, folderAliceSec);
  insertSenderMeta.run(e4, userIds['charlie@organization.local'], 0, 0, null);

  // Email 5: Draft email for Alice
  const e5 = insertEmail.run(
    userIds['alice@organization.local'],
    '[DRAFT] Q3 Intranet Vulnerability Assessment Report',
    `<p>To all department heads,</p>
    <p>Attached is the preliminary summary of the ethical hacking lab assessment performed on the internal LAN network...</p>`,
    null,
    1,
    '-2 hours'
  ).lastInsertRowid;

  insertSenderMeta.run(e5, userIds['alice@organization.local'], 0, 0, null);

  // 4. Contacts
  const insertContact = db.prepare(`
    INSERT INTO contacts (user_id, contact_user_id, nickname, notes)
    VALUES (?, ?, ?, ?)
  `);

  insertContact.run(userIds['alice@organization.local'], userIds['bob@organization.local'], 'Bob (NetOps)', 'Lead network engineer for LAN switches');
  insertContact.run(userIds['alice@organization.local'], userIds['charlie@organization.local'], 'Charlie Dev', 'Fullstack engineer on intranet core');
  insertContact.run(userIds['alice@organization.local'], userIds['admin@organization.local'], 'SysAdmin', 'Organization Superuser');
  insertContact.run(userIds['alice@organization.local'], userIds['david@organization.local'], 'David SecOps', 'Incident Response team');

  insertContact.run(userIds['bob@organization.local'], userIds['alice@organization.local'], 'Alice Sec', 'Cybersecurity lead');
  insertContact.run(userIds['charlie@organization.local'], userIds['alice@organization.local'], 'Alice', 'Security auditor');

  // 5. Chat Conversations & Messages
  const insertChatConv = db.prepare(`
    INSERT INTO chat_conversations (created_at, updated_at)
    VALUES (datetime('now', '-1 days'), datetime('now', '-10 minutes'))
  `);

  const conv1 = insertChatConv.run().lastInsertRowid;

  const insertParticipant = db.prepare(`
    INSERT INTO chat_participants (conversation_id, user_id, last_read_at)
    VALUES (?, ?, datetime('now'))
  `);

  insertParticipant.run(conv1, userIds['alice@organization.local']);
  insertParticipant.run(conv1, userIds['bob@organization.local']);

  const insertChatMessage = db.prepare(`
    INSERT INTO chat_messages (conversation_id, sender_id, message, is_read, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  insertChatMessage.run(conv1, userIds['bob@organization.local'], 'Hey Alice! Have you verified the new firewall rules for the intranet chat sockets?', 1, '-1 hours');
  insertChatMessage.run(conv1, userIds['alice@organization.local'], 'Yes Bob! Realtime WebSocket traffic on port 5000 is running seamlessly across the local subnet.', 1, '-45 minutes');
  insertChatMessage.run(conv1, userIds['bob@organization.local'], 'Awesome! Let me know if we need to expand max file attachment limits for engineering schematics.', 0, '-10 minutes');

  // Conversation 2: Alice & Charlie
  const conv2 = insertChatConv.run().lastInsertRowid;
  insertParticipant.run(conv2, userIds['alice@organization.local']);
  insertParticipant.run(conv2, userIds['charlie@organization.local']);

  insertChatMessage.run(conv2, userIds['charlie@organization.local'], 'Alice, the UI dark mode and responsive drawers are ready for testing.', 1, '-3 hours');
  insertChatMessage.run(conv2, userIds['alice@organization.local'], 'Testing it right now! The design looks super modern and clean.', 1, '-2 hours');

  // 6. Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, related_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertNotification.run(userIds['alice@organization.local'], 'email', 'New Email from Bob Smith', 'LAN Gateway Migration & Subnet 192.168.1.0/24 Verification', e2, 0, '-1 days');
  insertNotification.run(userIds['alice@organization.local'], 'email', 'New Email from Charlie Davis', 'Code Review: Parameterized SQLite Queries & IDOR Prevention', e4, 0, '-4 hours');
  insertNotification.run(userIds['alice@organization.local'], 'chat', 'New message from Bob Smith', 'Awesome! Let me know if we need to expand...', conv1, 0, '-10 minutes');

  console.log('✅ Database seeded successfully with demo users and sample content!');
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = seedDatabase;
