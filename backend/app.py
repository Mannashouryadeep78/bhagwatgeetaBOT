from flask import Flask, request, jsonify
from flask_cors import CORS
from rag_chain import BhagavadGitaRAG


app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Initialize RAG system
print("Initializing Bhagavad Gita RAG system...")
rag_system = BhagavadGitaRAG()
print("RAG system ready!")

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat requests"""
    try:
        data = request.json
        question = data.get('question', '')
        
        if not question:
            return jsonify({'error': 'No question provided'}), 400
        
        # Get answer from RAG system
        result = rag_system.get_answer(question)
        
        return jsonify({
            'answer': result['answer'],
            'sources': result['source_documents']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Bhagavad Gita RAG system is running'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)