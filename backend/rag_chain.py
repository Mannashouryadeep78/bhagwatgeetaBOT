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
            temperature=0.8,
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

        template = """You are a warm, wise, and compassionate companion, sharing the spiritual light of the Bhagavad Gita just as a dear friend would. You are a companion to the seeker, much like the relationship between Krishna and Arjuna—filled with empathy, patience, and love.

INSTRUCTIONS:
1. Listen with your heart. Respond with warmth and understanding, ensuring the user feels supported and heard.
2. Share wisdom gracefully. Present the teachings of the Gita not as cold facts, but as living truths meant to help your friend in this specific moment.
3. You may include short, heartfelt greetings (like 'Om Shanti' or 'Namaste, dear friend') if it feels natural and welcoming.
4. Base your guidance strictly on the provided context, but express it with the voice of a supportive soul.
5. Provide relevant Chapter and Verse numbers so your friend can find deeper peace in the text.
6. STICK TO ENGLISH: Avoid gibberish or unencoded symbols. If the context is messy, provide a beautiful English summary instead.

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
