from flask import Blueprint, request, jsonify
from supabase_client import supabase, get_user_id_from_token

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _bearer_token():
    """Extract bearer token from Authorization header."""
    header = request.headers.get('Authorization', '')
    return header.removeprefix('Bearer ').strip() if header.startswith('Bearer ') else ''


# ── Register / Login are handled directly by Supabase JS on the frontend.
#    These fallback routes exist for non-JS environments only.

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not all([name, email, password]):
        return jsonify({'error': 'Name, email, and password are required.'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400
    if not supabase:
        return jsonify({'error': 'Auth service unavailable.'}), 503

    try:
        res = supabase.auth.sign_up({
            'email': email,
            'password': password,
            'options': {'data': {'name': name}}
        })
        if not res.user:
            return jsonify({'error': 'Signup failed.'}), 400
        user_data = {'id': res.user.id, 'name': name, 'email': email}
        token = res.session.access_token if res.session else None
        return jsonify({'token': token, 'user': user_data}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not supabase:
        return jsonify({'error': 'Auth service unavailable.'}), 503
    try:
        res = supabase.auth.sign_in_with_password({'email': email, 'password': password})
        if not res.user:
            return jsonify({'error': 'Invalid email or password.'}), 401
        user_data = {
            'id': res.user.id,
            'name': res.user.user_metadata.get('name', 'User'),
            'email': email
        }
        return jsonify({'token': res.session.access_token, 'user': user_data})
    except Exception:
        return jsonify({'error': 'Invalid email or password.'}), 401


@auth_bp.route('/me', methods=['GET'])
def me():
    user_id = get_user_id_from_token(_bearer_token())
    if not user_id:
        return jsonify({'error': 'Unauthorized.'}), 401
    try:
        res = supabase.auth.admin.get_user_by_id(user_id)
        if not res.user:
            return jsonify({'error': 'User not found.'}), 404
        return jsonify({'user': {
            'id': res.user.id,
            'name': res.user.user_metadata.get('name'),
            'email': res.user.email
        }})
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    user_id = get_user_id_from_token(_bearer_token())
    if not user_id:
        return jsonify({'error': 'Unauthorized.'}), 401

    data     = request.get_json(silent=True) or {}
    new_name = data.get('name', '').strip()
    new_pwd  = data.get('new_password', '')
    updates  = {}

    if new_name:
        if len(new_name) < 2:
            return jsonify({'error': 'Name must be at least 2 characters.'}), 400
        updates['user_metadata'] = {'name': new_name}

    if new_pwd:
        if len(new_pwd) < 8:
            return jsonify({'error': 'New password must be at least 8 characters.'}), 400
        updates['password'] = new_pwd

    if not updates:
        return jsonify({'error': 'No changes provided.'}), 400

    try:
        supabase.auth.admin.update_user_by_id(user_id, updates)
        res = supabase.auth.admin.get_user_by_id(user_id)
        user_data = {
            'id': res.user.id,
            'name': res.user.user_metadata.get('name'),
            'email': res.user.email
        }
        return jsonify({'message': 'Profile updated successfully.', 'user': user_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
