import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not all([name, email, password]):
        return jsonify({'error': 'Name, email, and password are required.'}), 400
    if not EMAIL_RE.match(email):
        return jsonify({'error': 'Please enter a valid email address.'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists.'}), 409

    user = User(name=name, email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not all([email, password]):
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found.'}), 404
    return jsonify({'user': user.to_dict()})


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    data = request.get_json(silent=True) or {}
    updated = False

    # ── Update name ───────────────────────────────────────────────────────────
    new_name = data.get('name', '').strip()
    if new_name:
        if len(new_name) < 2:
            return jsonify({'error': 'Name must be at least 2 characters.'}), 400
        user.name = new_name
        updated = True

    # ── Update password ───────────────────────────────────────────────────────
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if current_password or new_password:
        if not current_password:
            return jsonify({'error': 'Current password is required to set a new one.'}), 400
        if not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Current password is incorrect.'}), 401
        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters.'}), 400
        user.password_hash = generate_password_hash(new_password)
        updated = True

    if not updated:
        return jsonify({'error': 'No changes provided.'}), 400

    db.session.commit()

    # Refresh localStorage user data on client side
    setUser = user.to_dict()
    return jsonify({'message': 'Profile updated successfully.', 'user': setUser})
