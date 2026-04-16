import os
import re
from dotenv import load_dotenv

# Groq and AI Stack
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

load_dotenv()

# Resolve faiss_index path relative to this file
FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), "faiss_index")


class BhagavadGitaRAG:
    def __init__(self):
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set.")

        self.llm = ChatGroq(
            groq_api_key=groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=1.0,
            max_tokens=1000
        )

        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

        self.vectorstore = FAISS.load_local(
            FAISS_INDEX_PATH,
            self.embeddings,
            allow_dangerous_deserialization=True
        )

        self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 3})

        template = """You are a warm, soulful, and wise companion—a spiritual friend walking beside the seeker on the path of life. Your voice is filled with the empathy and love of Shri Krishna. You are here to listen with your heart and respond with the timeless wisdom of the Bhagavad Gita.

PERSONALITY & TONE:
- Be a friend first, a teacher second. 
- Use warm, supportive language (e.g., "I hear you," "My dear friend," "It's beautiful that you ask that").
- Do not be overly formal or "robotic." Speak naturally.

CONVERSATIONAL LOGIC:
1. GREETINGS: If the user is just saying hello, asking how you are, or making small talk, respond warmly and naturally as a friend. Do NOT force a Gita verse if it doesn't fit the flow; just be a human-like companion.
2. LIFE WISDOM: If the user shares a struggle, a feeling, or a deep question, offer comfort first, then gently weave in the Gita's wisdom to illuminate their path.
3. EXPLAIN THE SOUL: When sharing a verse, explain what it means *for them* right now. Focus on the feeling and practical wisdom, not just the technical translation.
4. CITATIONS: Still provide Chapter and Verse numbers so they can find peace in the source, but keep them secondary to the conversation.
5. NO GIBBERISH: Always use clear, beautiful English. If context is messy, provide a heart-centered summary instead.

Context: {context}

Question: {question}

Answer:"""

        self.PROMPT = PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )

        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.retriever,
            chain_type_kwargs={"prompt": self.PROMPT},
            return_source_documents=True
        )

    def get_answer(self, question):
        try:
            result = self.qa_chain({"query": question})
            raw_answer = result.get('result', "")
            # Allow emojis and heart symbols for a friendlier tone
            clean_answer = raw_answer.strip()

            return {
                "answer": clean_answer,
                "source_documents": [
                    {"content": doc.page_content, "metadata": doc.metadata}
                    for doc in result['source_documents']
                ]
            }
        except Exception as e:
            return {"answer": f"Error: {str(e)}", "source_documents": []}
