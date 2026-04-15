from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from supabase_client import supabase

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not all([name, email, password]):
        return jsonify({'error': 'Name, email, and password are required.'}), 400

    try:
        # Supabase signup
        res = supabase.auth.sign_up({"email": email, "password": password, "options": {"data": {"name": name}}})
        if not res.user:
             return jsonify({'error': 'Signup failed.'}), 400
        
        user_data = {
            'id': res.user.id,
            'name': name,
            "email": email
        }
        
        # In a real app, you might want to return the Supabase token directly
        # but to maintain compatibility with existing frontend script.js:
        token = create_access_token(identity=str(res.user.id))
        return jsonify({'token': token, 'user': user_data}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    try:
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if not res.user:
            return jsonify({'error': 'Invalid email or password.'}), 401
        
        user_data = {
            'id': res.user.id,
            'name': res.user.user_metadata.get('name', 'User'),
            'email': email
        }
        
        token = create_access_token(identity=str(res.user.id))
        return jsonify({'token': token, 'user': user_data})
    except Exception as e:
        return jsonify({'error': 'Invalid email or password.'}), 401

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    try:
        # Get user from Supabase admins (service role)
        res = supabase.auth.admin.get_user_by_id(user_id)
        if not res.user:
             return jsonify({'error': 'User not found.'}), 404
        
        user_data = {
            'id': res.user.id,
            'name': res.user.user_metadata.get('name'),
            'email': res.user.email
        }
        return jsonify({'user': user_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    
    updates = {}
    new_name = data.get('name', '').strip()
    if new_name:
        updates["data"] = {"name": new_name}
    
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    try:
        if new_name:
            # Update user metadata
            supabase.auth.admin.update_user_by_id(user_id, {"user_metadata": {"name": new_name}})
        
        if new_password:
            # Note: For password change via admin, we usually need specific permissions
            # or the user needs to be logged in to Supabase site.
            # Using service role for simplicity here:
            supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})
            
        # Get updated user
        res = supabase.auth.admin.get_user_by_id(user_id)
        user_data = {
            'id': res.user.id,
            'name': res.user.user_metadata.get('name'),
            'email': res.user.email
        }
        return jsonify({'message': 'Profile updated successfully.', 'user': user_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
