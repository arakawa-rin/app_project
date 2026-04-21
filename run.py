from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import timedelta
import os
from models import db
from app.api_route import api


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'paylog', 'dist')

load_dotenv(os.path.join(BASE_DIR, 'app', '.env'))

app = Flask(__name__)

IS_PROD = os.getenv("RENDER") == "true"

# In production we serve the SPA and API from the same origin, so CORS is
# only needed for local web development.
if not IS_PROD:
    CORS(app, supports_credentials=True, origins=["http://localhost:8081"])

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

app.secret_key = os.getenv("app_password") or os.getenv("SECRET_KEY") or "dev-secret-key"
app.permanent_session_lifetime = timedelta(days=365)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = IS_PROD

app.register_blueprint(api)


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    full_path = os.path.join(DIST_DIR, path)
    if path and os.path.isfile(full_path):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, 'index.html')


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')
