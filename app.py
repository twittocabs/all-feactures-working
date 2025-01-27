from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import psycopg2
import os
import logging
import secrets
import hashlib
from datetime import datetime
import psycopg2.extras
from flask_socketio import SocketIO, emit

app = Flask(__name__, static_folder=r'C:\twitto_cabs\static', template_folder='templates')
CORS(app)
app.config['SECRET_KEY'] = 'your_secret_key'  # Replace with a real secret key
socketio = SocketIO(app, cors_allowed_origins="*")
DATABASE = "twitto_cabs_db"

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
app.logger.setLevel(logging.INFO)

def get_db_connection():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="1234",  # IMPORTANT: Use your actual password
            database="twitto_cabs_db",
        )
        return conn
    except Exception as e:
        app.logger.error(f"Database connection error: {e}", exc_info=True)
        raise e

def init_db(app):
    """Initialize the database with users and their respective salts if no salt exists."""
    with app.app_context():
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if the users table exists and has a salt column.
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
        columns = [row[0] for row in cursor.fetchall()]

        if 'salt' not in columns:
            print("table users has no column named salt. creating...")
            cursor.execute("ALTER TABLE users ADD COLUMN salt TEXT;")
            conn.commit()

        # Check for users with no salts (NULL salt)
        cursor.execute("SELECT id FROM users WHERE salt IS NULL")
        users_without_salt = cursor.fetchall()

        # Batch update for users
        if users_without_salt:
            update_query = "UPDATE users SET salt = data.salt FROM (VALUES %s) AS data(salt, id) WHERE users.id = data.id"
            salt_data = []
            for user_id in users_without_salt:
                salt = secrets.token_hex(16)
                salt_data.append((salt, user_id[0]))
            # Parameterize the query for bulk insertion
            psycopg2.extras.execute_values(cursor, update_query, salt_data)
            conn.commit()

        print("Database initialized successfully.")
        conn.close()

def setup_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        with open('schema.sql', 'r') as f:
            sql_commands = f.read().split(';')
            for command in sql_commands:
                if command.strip():
                    cursor.execute(command)
            conn.commit()
        print("Database schema setup successfully.")
    except Exception as e:
        conn.rollback()
        print(f"An error occurred during database schema setup: {e}")
        app.logger.error(f"Unexpected error during schema setup: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()

@app.route('/')
def index():
    return render_template('index.html')


# --- USER ENDPOINTS ---
def hash_password(password, salt):
    """Hashes the password using sha256 and a random salt for security."""
    salted_password = salt + password
    hashed_password = hashlib.sha256(salted_password.encode()).hexdigest()
    return hashed_password

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    gender = data.get('gender')

    if not name or not email or not password or not gender:
        return jsonify({'error': 'All fields are required'}), 400

    app.logger.info(f"Received signup data: name={name}, email={email}, gender={gender}")

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = cur.fetchone()
        if existing_user:
            conn.close()
            app.logger.info(f"Signup failed: Email address '{email}' already exists")
            return jsonify({'error': 'Email address already exists'}), 409

        salt = secrets.token_hex(16)
        hashed_password = hash_password(password, salt)

        app.logger.info(f"Inserting user: name={name}, email={email}, gender={gender}")
        cur.execute(
            "INSERT INTO users (name, email, password, gender, salt) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (name, email, hashed_password, gender, salt))
        user_id = cur.fetchone()[0]
        conn.commit()
        app.logger.info(f"User created successfully with id: {user_id}")
        return jsonify({'id': user_id, 'message': 'User created successfully'}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Database error during signup: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

def verify_password(db_password, salt, input_password):
    """Verifies the password against the stored hash."""
    hashed_input_password = hash_password(input_password, salt)
    return hashed_input_password == db_password

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if row:
            salt = row[5]
            db_password = row[3]
            if verify_password(db_password, salt, password):
                user = {
                    'id': row[0],
                    'name': row[1],
                    'email': row[2],
                    'gender': row[4],
                }
                return jsonify(user), 200
            else:
                return jsonify({'message': 'Invalid credentials'}), 401
        else:
            return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        app.logger.error(f"Database error during login: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, email, gender FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if row:
            user = {
                'id': row[0],
                'name': row[1],
                'email': row[2],
                'gender': row[3],
            }
            return jsonify(user), 200
        else:
            return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        app.logger.error(f"Database error fetching user: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

# --- RIDE ENDPOINTS ---
@app.route('/rides', methods=['GET'])
def get_rides():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute('SELECT * FROM rides')
        # Correctly fetch rides by accessing columns by index
        rides = []
        column_names = [desc[0] for desc in cur.description]  # Get column names
        for row in cur.fetchall():
            ride = dict(zip(column_names, row))  # create a dictionary using the column names as keys
            rides.append(ride)
        return jsonify(rides), 200
    except Exception as e:
        app.logger.error(f"Error in get_rides: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/rides', methods=['POST'])
def create_ride():
    data = request.get_json()
    app.logger.info('received post request, with body %s', data)

    ride_type = data.get('type')
    pick_up = data.get('pickUp')
    drop_off = data.get('dropOff')
    user_name = data.get('userName')
    gender = data.get('gender')
    seats = data.get('seats')
    car_type = data.get('carType')
    persons = data.get('persons')
    contact = data.get('contact')
    bags = data.get('bags')
    price = data.get('price')
    bags_allowed = data.get('bagsAllowed')
    pets_allowed = data.get('petsAllowed')
    user_id = data.get('user_id')
    is_full = data.get('is_full')


    if not ride_type or not pick_up or not drop_off or not user_name or not gender or not seats or not car_type or not persons or not contact:
        return jsonify({'error': 'All fields are required'}), 400

    conn = get_db_connection()
    try:
        # Data Type Handling: Convert to correct types
        try:
          seats = int(seats) if seats is not None else None
          persons = int(persons) if persons is not None else None
        except (ValueError, TypeError):
          return jsonify({'error': 'Invalid input for seats and/or persons, must be an integer'}), 400

        # Data Type Handling for Optionals
        try:
           bags = int(bags) if bags else None
           price = float(price) if price else None
           bags_allowed = int(bags_allowed) if bags_allowed else None
           user_id = int(user_id) if user_id else None
           pets_allowed = pets_allowed if pets_allowed else None
        except (ValueError, TypeError):
           return jsonify({'error': 'Invalid input for optional fields, must be a number or null'}), 400
       
        is_full = is_full if is_full is not None else False
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO rides (type, pickUp, dropOff, userName, gender, seats, carType, persons, contact, bags, price, bagsAllowed, petsAllowed, user_id, is_full) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (ride_type, pick_up, drop_off, user_name, gender, seats, car_type, persons, contact, bags, price,
             bags_allowed, pets_allowed, user_id, is_full))
        ride_id = cur.fetchone()[0]
        conn.commit()
        broadcast_rides_update()
        return jsonify({'id': ride_id, 'message': 'Ride created successfully'}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Database error during create ride: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()


@app.route('/rides/<int:ride_id>/book', methods=['POST'])
def book_ride(ride_id):
    conn = get_db_connection()
    try:
        app.logger.info(f"Attempting to book ride with ID: {ride_id}")
        cur = conn.cursor()
        
        # check if the ride is full first
        app.logger.info(f"Fetching ride data for ride id: {ride_id}")
        cur.execute("SELECT is_full, seats, persons FROM rides WHERE id = %s", (ride_id,))
        ride_data = cur.fetchone()
        app.logger.info(f"Ride data: {ride_data}")

        if not ride_data:
            app.logger.info(f"Ride with id: {ride_id} was not found")
            return jsonify({'error': 'Ride not found'}), 404

        is_full, seats, persons = ride_data
        app.logger.info(f"is_full: {is_full}, seats: {seats}, persons: {persons}")

        if seats <= persons:
            app.logger.info(f"Ride with id {ride_id} is full. seats: {seats}, persons: {persons}")
            return jsonify({'error': 'Ride is full'}), 400
        
        # if not full then book the ride, i.e. increase the persons
        app.logger.info(f"Booking ride with id {ride_id}")
        cur.execute("UPDATE rides SET persons = persons + 1  WHERE id = %s", (ride_id,))
        
        # now check if it is full after we update, if it is then update the flag
        app.logger.info(f"Checking if the ride with id {ride_id} is full after booking")
        cur.execute("SELECT seats, persons FROM rides WHERE id = %s", (ride_id,))
        ride_data = cur.fetchone()
        seats, persons = ride_data
        app.logger.info(f"seats: {seats}, persons: {persons}")
        
        if seats == persons:
            app.logger.info(f"Updating is_full to true for ride {ride_id}")
            cur.execute("UPDATE rides SET is_full = TRUE WHERE id = %s", (ride_id,))

        conn.commit()
        app.logger.info(f"Successfully booked ride with id: {ride_id}")
        broadcast_rides_update()
        return jsonify({'message': 'Ride booked successfully'}), 200
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Database error booking ride: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/rides/<int:ride_id>', methods=['DELETE'])
def delete_ride(ride_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM rides WHERE id = %s", (ride_id,))
        conn.commit()
        broadcast_rides_update()
        return jsonify({'message': 'Ride deleted successfully'}), 200
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Database error deleting ride: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()


# --- SHOWN CONTACTS ENDPOINTS ---
@app.route('/shown-contacts', methods=['GET'])
def get_shown_contacts():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute('SELECT * FROM shown_contacts')
        contacts = []
        column_names = [desc[0] for desc in cur.description]
        for row in cur.fetchall():
            contact = dict(zip(column_names, row))
            contacts.append(contact)
        return jsonify(contacts), 200
    except Exception as e:
        app.logger.error(f"Database error fetching shown contacts: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/shown-contacts', methods=['POST'])
def create_shown_contact():
    data = request.get_json()
    ride_id = data.get('ride_id')
    show_contact = data.get('show_contact')
    conn = get_db_connection()
    try:
         # Convert to integer and validate
        try:
          ride_id = int(ride_id)
        except (ValueError, TypeError):
          app.logger.error(f"Invalid ride_id provided: {ride_id}", exc_info=True)
          return jsonify({'error': 'Invalid ride_id, must be an integer'}), 400
          
        # Convert to boolean and validate 
        try:
          show_contact = bool(show_contact)
        except (ValueError, TypeError):
          app.logger.error(f"Invalid show_contact provided: {show_contact}", exc_info=True)
          return jsonify({'error': 'Invalid show_contact, must be a boolean'}), 400

        cur = conn.cursor()
        cur.execute("INSERT INTO shown_contacts (ride_id, show_contact) VALUES (%s, %s) ON CONFLICT (ride_id) DO UPDATE SET show_contact = %s RETURNING id",
                    (ride_id, show_contact, show_contact))
        contact_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'id': contact_id, 'message': 'Contact updated successfully'}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Database error during shown contacts: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/rides/<int:ride_id>/ratings', methods=['POST'])
def create_rating(ride_id):
    data = request.get_json()
    user_id = data.get('user_id')
    rating = data.get('rating')
    if not rating or not user_id:
         return jsonify({'error': 'All fields are required'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO ride_ratings (ride_id, user_id, rating) VALUES (%s, %s, %s) RETURNING id",
               (ride_id, user_id, rating))
        rating_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'id': rating_id, 'message': 'Rating created successfully'}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Database error rating ride: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/rides/<int:ride_id>/reviews', methods=['POST'])
def create_review(ride_id):
    data = request.get_json()
    user_id = data.get('user_id')
    comment = data.get('comment')
    if not comment or not user_id:
         return jsonify({'error': 'All fields are required'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO ride_reviews (ride_id, user_id, comment) VALUES (%s, %s, %s) RETURNING id",
               (ride_id, user_id, comment))
        review_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'id': review_id, 'message': 'Review created successfully'}), 201
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Database error rating ride: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/rides/<int:ride_id>/reviews', methods=['GET'])
def get_reviews(ride_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM ride_reviews WHERE ride_id = %s", (ride_id,))
        reviews = []
        column_names = [desc[0] for desc in cur.description]
        for row in cur.fetchall():
            review = dict(zip(column_names, row))
            reviews.append(review)
        return jsonify(reviews), 200
    except Exception as e:
        app.logger.error(f"Database error fetching reviews: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    finally:
        conn.close()

def broadcast_rides_update():
    """Broadcasts the updated rides list to all connected clients."""
    with app.app_context():
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('SELECT * FROM rides')
            rides = []
            column_names = [desc[0] for desc in cur.description]  # Get column names
            for row in cur.fetchall():
                ride = dict(zip(column_names, row))  # create a dictionary using the column names as keys
                rides.append(ride)
            socketio.emit('rides_updated', {'rides': rides}, broadcast=True)
        except Exception as e:
            app.logger.error(f"Error broadcasting rides update: {e}", exc_info=True)
        finally:
           conn.close()


if __name__ == '__main__':
    setup_database()
    with app.app_context():
        init_db(app)
    socketio.run(app, debug=False, port=4000)