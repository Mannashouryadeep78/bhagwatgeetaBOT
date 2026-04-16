from functools import wraps
from flask import Blueprint, request, jsonify
from supabase_client import supabase, get_user_id_from_token

history_bp = Blueprint('history', __name__, url_prefix='/api/history')


def _bearer_token():
    header = request.headers.get('Authorization', '')
    return header.removeprefix('Bearer ').strip() if header.startswith('Bearer ') else ''


def require_auth(f):
    """Decorator: verify Supabase JWT and inject user_id as first arg."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = get_user_id_from_token(_bearer_token())
        if not user_id:
            return jsonify({'error': 'Unauthorized.'}), 401
        return f(user_id, *args, **kwargs)
    return decorated


@history_bp.route('/', methods=['GET'])
@history_bp.route('', methods=['GET'])
@require_auth
def get_history(user_id):
    try:
        res = (supabase.table('conversations')
               .select('*')
               .eq('user_id', user_id)
               .order('created_at', desc=True)
               .limit(100)
               .execute())
        return jsonify({'history': res.data})
    except Exception:
        return jsonify({'history': []})


@history_bp.route('/clear', methods=['DELETE'])
@require_auth
def clear_history(user_id):
    try:
        supabase.table('conversations').delete().eq('user_id', user_id).execute()
        return jsonify({'message': 'All history cleared.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@history_bp.route('/<conv_id>', methods=['DELETE'])
@require_auth
def delete_conversation(user_id, conv_id):
    try:
        supabase.table('conversations').delete().eq('id', conv_id).eq('user_id', user_id).execute()
        return jsonify({'message': 'Deleted.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
