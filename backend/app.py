import os
from datetime import timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from models import db, Conversation
from auth import auth_bp
from history import history_bp
from rag_chain import BhagavadGitaRAG


app = Flask(__name__)
CORS(app)

# ── Database ──────────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), 'gita.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ── JWT ───────────────────────────────────────────────────────────────────────
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# ── Init extensions ───────────────────────────────────────────────────────────
db.init_app(app)
jwt = JWTManager(app)

# ── Blueprints ────────────────────────────────────────────────────────────────
app.register_blueprint(auth_bp)
app.register_blueprint(history_bp)

# ── Create DB tables on first run ─────────────────────────────────────────────
with app.app_context():
    db.create_all()

# ── RAG system ────────────────────────────────────────────────────────────────
print("Initializing Bhagavad Gita RAG system...")
rag_system = BhagavadGitaRAG()
print("RAG system ready!")


@app.route('/api/chat', methods=['POST'])
@jwt_required(optional=True)
def chat():
    try:
        data = request.json
        question = data.get('question', '').strip()

        if not question:
            return jsonify({'error': 'No question provided'}), 400

        result = rag_system.get_answer(question)
        answer = result['answer']

        # Save to history if user is logged in
        user_id = get_jwt_identity()
        if user_id:
            conv = Conversation(
                user_id=int(user_id),
                question=question,
                answer=answer
            )
            db.session.add(conv)
            db.session.commit()
            conv_id = conv.id
        else:
            conv_id = None

        return jsonify({
            'answer': answer,
            'sources': result['source_documents'],
            'conversation_id': conv_id
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'Bhagavad Gita RAG system is running'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
