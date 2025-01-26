CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    gender TEXT NOT NULL,
    salt TEXT
);

CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    pickUp TEXT NOT NULL,
    dropOff TEXT NOT NULL,
    userName TEXT NOT NULL,
    gender TEXT NOT NULL,
    seats INTEGER NOT NULL,
    carType TEXT NOT NULL,
    persons INTEGER NOT NULL,
    contact TEXT NOT NULL,
    bags INTEGER,
    price INTEGER,
    bagsAllowed INTEGER,
    petsAllowed TEXT,
    user_id INTEGER,
     booked_seats INTEGER NOT NULL DEFAULT 0,
    is_full BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shown_contacts (
    id SERIAL PRIMARY KEY,
    ride_id TEXT NOT NULL,
    show_contact INTEGER NOT NULL
);