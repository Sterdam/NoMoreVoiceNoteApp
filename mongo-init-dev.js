print('Start MongoDB initialization for development...');

// Authentification avec l'utilisateur root
db = db.getSiblingDB('admin');
db.auth('admin', 'devpassword');

// Basculer vers la base de données voxkill-dev
db = db.getSiblingDB('voxkill-dev');

try {
    db.createUser({
        user: 'admin',
        pwd: 'devpassword',
        roles: [
            { role: 'dbOwner', db: 'voxkill-dev' },
            { role: 'readWrite', db: 'voxkill-dev' }
        ]
    });
    print('User created successfully');
} catch (error) {
    print('User might already exist, continuing...');
}

try {
    db.createCollection('users');
    db.createCollection('transcripts');
    db.createCollection('subscriptions');
    db.createCollection('usages');
    print('Collections created successfully');
} catch (error) {
    print('Collections might already exist, continuing...');
}

print('MongoDB initialization complete for voxkill-dev');