import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS # New import
from dotenv import load_dotenv

# New, corrected imports for the latest Plaid Python library
import plaid
from plaid import Environment
from plaid.api import plaid_api

# -----------------
# 1. Server Setup
# -----------------
# Load environment variables from the .env file.
load_dotenv()

# Initialize the Flask application.
app = Flask(__name__)
CORS(app) # Enable CORS

# -----------------
# 2. Plaid Client Initialization
# -----------------
# Retrieve your Plaid API credentials and environment from the .env file.
# Note: Do NOT hardcode your keys here.
PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')
PLAID_ENV = os.getenv('PLAID_ENV')

# This is the new, correct way to initialize the Plaid client.
configuration = plaid.Configuration(
    host=getattr(plaid.Environment, PLAID_ENV),
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET,
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

# A temporary, in-memory store for access tokens.
access_token = None


# -----------------
# 3. API Endpoints
# -----------------


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/create_link_token', methods=['POST'])
def create_link_token():
    """
    Creates a temporary link_token to initialize Plaid Link.
    """
    try:
        # The user's ID is used for security and to associate the token with a user.
        # In a real app, this would come from the authenticated user's session.
        user_id = 'user-id123'

        # Create a new link token.
        # This syntax is slightly different in the new library version.
        link_token_request = {
            'user': {'client_user_id': user_id},
            'client_name': 'My Finance App',
            'products': ['auth', 'transactions'],
            'country_codes': ['US'],
            'language': 'en',
        }
        link_token_response = client.link_token_create(link_token_request)
        link_token = link_token_response.get('link_token')

        return jsonify({'link_token': link_token})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/exchange_public_token', methods=['POST'])
def exchange_public_token():
    """
    Exchanges the temporary public_token for a permanent access_token.
    This is the most critical step.
    """
    global access_token
    public_token = request.json['public_token']
    try:
        # Exchange the public token for an access token.
        exchange_request = {'public_token': public_token}
        exchange_response = client.item_public_token_exchange(exchange_request)
        access_token = exchange_response['access_token']

        # In a real app, you would save this access_token to your database
        # and associate it with the user.

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get_transactions', methods=['GET'])
def get_transactions():
    """
    Fetches the latest transactions using the stored access_token.
    """
    global access_token
    if not access_token:
        return jsonify({'error': 'Access token not available. Please link an item first.'}), 400

    try:
        # Fetch transaction data from the Plaid API.
        transactions_request = {'access_token': access_token}
        transactions_response = client.transactions_sync(transactions_request)

        # In a real application, you would handle pagination and cursor-based syncing.
        transactions = transactions_response.get('added', [])

        return jsonify({'transactions': transactions})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -----------------
# 4. Run the App
# -----------------

if __name__ == '__main__':
    # Flask runs on port 5000 by default.
    app.run(port=5000, debug=True)