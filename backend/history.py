from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from supabase_client import supabase

history_bp = Blueprint('history', __name__, url_prefix='/api/history')

@history_bp.route('', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    try:
        res = supabase.table('conversations').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(100).execute()
        return jsonify({'history': res.data})
    except Exception as e:
        return jsonify({'history': []})

@history_bp.route('/<conv_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conv_id):
    user_id = get_jwt_identity()
    try:
        supabase.table('conversations').delete().eq('id', conv_id).eq('user_id', user_id).execute()
        return jsonify({'message': 'Deleted.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@history_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    user_id = get_jwt_identity()
    try:
        supabase.table('conversations').delete().eq('user_id', user_id).execute()
        return jsonify({'message': 'All history cleared.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
