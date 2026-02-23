import os
from dotenv import load_dotenv

# Groq and AI Stack
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# Essential Classic Imports (Fixes ModuleNotFoundError)
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
import re

load_dotenv()

class BhagavadGitaRAG:
    def __init__(self):
        # Initialize Groq LLM with supported 2026 model
        self.llm = ChatGroq(
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1000
        )
        
        # Load modern embeddings
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # Load vector store from your local FAISS index
        self.vectorstore = FAISS.load_local(
            "faiss_index", 
            self.embeddings,
            allow_dangerous_deserialization=True
        )
        
        self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 3})
        
        # Prompt Template
        # Updated Prompt Template to remove garbled text and long introductions
        # Double the curly braces in the forbidden text string to "escape" them
        template = """You are a direct and concise guide on the Bhagavad Gita. 
        
        INSTRUCTIONS:
        1. Answer the user's question immediately and directly using only the context provided.
        2. DO NOT include long introductory greetings or the 'Om, Tat, Sat' invocation.
        3. STRICTLY FORBIDDEN: Do not output any garbled text or gibberish symbols like "ko Vn{{g XmZo". 
        4. If the context contains these symbols, ignore them and provide the English translation or summary instead.
        5. Provide relevant Chapter and Verse numbers for your answer.
        
        Context: {context}
        
        Question: {question}
        
        Answer:"""
        
        self.PROMPT = PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
        
        # Create QA chain using classic support
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
            import re
            clean_answer = re.sub(r'[^\x00-\x7F]+', '', raw_answer)
            
            # result = self.qa_chain.invoke({"query": question})
            # For RetrievalQA, standard practice is still 'query'
            result = self.qa_chain({"query": question})
            return {
                "answer": clean_answer,
                "source_documents": [
                    {"content": doc.page_content, "metadata": doc.metadata}
                    for doc in result['source_documents']
                ]
            }
        except Exception as e:
            return {"answer": f"Error: {str(e)}", "source_documents": []}