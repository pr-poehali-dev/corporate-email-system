CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('owner', 'user')),
    display_name VARCHAR(100),
    is_online BOOLEAN DEFAULT FALSE,
    last_seen BIGINT,
    never_logged_in BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_recipients (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_message_recipients_user ON message_recipients(to_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

INSERT INTO users (email, first_name, last_name, password, role, display_name, is_online, never_logged_in) 
VALUES ('boss@MyMail', 'Владелец', 'Системы', 'admin', 'owner', 'Босс', FALSE, FALSE)
ON CONFLICT (email) DO NOTHING;