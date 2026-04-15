from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Conversation

history_bp = Blueprint('history', __name__, url_prefix='/api/history')


@history_bp.route('', methods=['GET'])
@jwt_required()
def get_history():
    user_id = int(get_jwt_identity())
    conversations = (
        Conversation.query
        .filter_by(user_id=user_id)
        .order_by(Conversation.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify({'history': [c.to_dict() for c in conversations]})


@history_bp.route('/<int:conv_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conv_id):
    user_id = int(get_jwt_identity())
    conv = Conversation.query.filter_by(id=conv_id, user_id=user_id).first()
    if not conv:
        return jsonify({'error': 'Conversation not found.'}), 404
    db.session.delete(conv)
    db.session.commit()
    return jsonify({'message': 'Deleted.'})


@history_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    user_id = int(get_jwt_identity())
    Conversation.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'All history cleared.'})
