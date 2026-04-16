import os
from datetime import date
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from auth import auth_bp
from history import history_bp
from rag_chain import BhagavadGitaRAG
from supabase_client import supabase, get_user_id_from_token


app = Flask(__name__)
CORS(app)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["300 per hour"],
    storage_uri="memory://",
)

@app.errorhandler(429)
def ratelimit_handler(_e):
    return jsonify({'error': 'Too many requests. Please slow down.'}), 429

# ── Blueprints ────────────────────────────────────────────────────────────────
app.register_blueprint(auth_bp)
app.register_blueprint(history_bp)

limiter.limit("5 per minute")(auth_bp)

# ── RAG system ────────────────────────────────────────────────────────────────
print("Initializing Bhagavad Gita RAG system...")
rag_system = BhagavadGitaRAG()
print("RAG system ready!")

# ── Verse of the Day data (rotates daily) ─────────────────────────────────────
VERSES = [
    {"chapter": 2, "verse": 47, "text": "You have the right to perform your actions, but never to the fruits thereof. Let not the fruits of action be your motive, nor let your attachment be to inaction.", "theme": "Karma Yoga"},
    {"chapter": 2, "verse": 20, "text": "The soul is never born nor dies at any time. It has not come into being, does not come into being, and will not come into being. It is unborn, eternal, ever-existing, and primeval.", "theme": "The Eternal Soul"},
    {"chapter": 2, "verse": 14, "text": "The contact between the senses and sense objects, which gives rise to cold and heat, pleasure and pain, has a beginning and end. They are impermanent; endure them, O Arjuna.", "theme": "Impermanence"},
    {"chapter": 3, "verse": 27, "text": "All actions are performed by the qualities of nature. The self, deluded by ego, thinks: 'I am the doer.'", "theme": "Ego and Action"},
    {"chapter": 4, "verse": 7,  "text": "Whenever there is a decline of righteousness and rise of unrighteousness, O Arjuna, then I manifest Myself.", "theme": "Divine Intervention"},
    {"chapter": 4, "verse": 38, "text": "In this world, there is nothing as purifying as knowledge. One who has attained purity of mind through prolonged practice of yoga finds this knowledge within himself in course of time.", "theme": "The Power of Knowledge"},
    {"chapter": 5, "verse": 10, "text": "One who performs their duty without attachment, surrendering the results unto the Supreme, is not affected by sinful action, as the lotus leaf is untouched by water.", "theme": "Detachment"},
    {"chapter": 6, "verse": 5,  "text": "Elevate yourself through the power of your mind, and do not degrade yourself, for the mind can be the friend and also the enemy of the self.", "theme": "Self-Mastery"},
    {"chapter": 6, "verse": 19, "text": "As a lamp in a windless place does not flicker, so a yogi with a controlled mind remains steady in meditation on the transcendent self.", "theme": "Meditation"},
    {"chapter": 9, "verse": 22, "text": "To those who worship Me with devotion, meditating on My transcendental form, I carry what they lack and preserve what they have.", "theme": "Divine Protection"},
    {"chapter": 10, "verse": 20, "text": "I am the Self, O Arjuna, seated in the hearts of all living entities. I am the beginning, the middle, and the end of all beings.", "theme": "The Universal Self"},
    {"chapter": 11, "verse": 33, "text": "Therefore, arise and attain glory. Conquer your enemies and enjoy a prosperous kingdom. They have already been put to death by My arrangement, and you, O Savyasachi, can be but an instrument.", "theme": "Divine Will"},
    {"chapter": 12, "verse": 15, "text": "He by whom no one is put into difficulty and who is not disturbed by anyone, who is equipoised in happiness and distress, fear and anxiety, is very dear to Me.", "theme": "Equanimity"},
    {"chapter": 13, "verse": 28, "text": "One who sees the Supreme Lord existing equally everywhere in all living beings, the imperishable within the perishable, truly sees.", "theme": "Seeing the Divine"},
    {"chapter": 15, "verse": 15, "text": "I am present in everyone's heart, and from Me come remembrance, knowledge and forgetfulness. I am the object of knowledge in all the Vedas; I am the author of Vedanta, and I know the Vedas.", "theme": "The Inner Guide"},
    {"chapter": 16, "verse": 3,  "text": "Fearlessness, purity of heart, perseverance in acquiring wisdom and in practising yoga, charity, control of the senses — these are the qualities of those born with divine tendencies.", "theme": "Divine Qualities"},
    {"chapter": 17, "verse": 3,  "text": "The faith of each person corresponds to their nature. A person is what their faith is; what they have faith in, that indeed they are.", "theme": "Faith"},
    {"chapter": 18, "verse": 66, "text": "Abandon all varieties of religion and just surrender unto Me. I shall deliver you from all sinful reactions. Do not fear.", "theme": "Surrender"},
]

@app.route('/api/verse-of-day', methods=['GET'])
def verse_of_day():
    day_index = date.today().timetuple().tm_yday  # 1–365
    verse = VERSES[(day_index - 1) % len(VERSES)]
    return jsonify(verse)


@app.route('/api/chat', methods=['POST'])
@limiter.limit("12 per minute")
def chat():
    try:
        data = request.json
        question = (data.get('question') or '').strip()

        if not question:
            return jsonify({'error': 'No question provided'}), 400

        result = rag_system.get_answer(question)
        answer = result['answer']

        # Save to history if user is logged in (Supabase JWT verification)
        token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
        user_id = get_user_id_from_token(token) if token else None
        conv_id = None
        if user_id and supabase:
            res = supabase.table('conversations').insert({
                'user_id': user_id,
                'question': question,
                'answer': answer
            }).execute()
            if res.data:
                conv_id = res.data[0]['id']

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
