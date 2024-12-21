print('Start MongoDB initialization...');

db.auth('admin', 'password123');

db = db.getSiblingDB('whatsapp-transcriber');

try {
    db.createUser({
        user: 'admin',
        pwd: 'password123',
        roles: [
            { role: 'dbOwner', db: 'whatsapp-transcriber' },
            { role: 'readWrite', db: 'whatsapp-transcriber' }
        ]
    });
    print('User created successfully');
} catch (error) {
    print('User might already exist, continuing...');
}

try {
    db.createCollection('users');
    db.createCollection('transcripts');
    print('Collections created successfully');
} catch (error) {
    print('Collections might already exist, continuing...');
}

try {
    // Create indexes
    db.users.createIndex(
        { email: 1 },
        { 
            unique: true,
            background: true
        }
    );

    db.users.createIndex(
        { whatsappNumber: 1 },
        { 
            unique: true,
            background: true
        }
    );

    db.transcripts.createIndex(
        { userId: 1, createdAt: -1 },
        { background: true }
    );

    db.transcripts.createIndex(
        { messageId: 1 },
        { background: true }
    );

    db.transcripts.createIndex(
        { status: 1 },
        { background: true }
    );

    print('Indexes created successfully');
} catch (error) {
    print('Error creating indexes: ' + error.message);
}

print('MongoDB initialization complete');