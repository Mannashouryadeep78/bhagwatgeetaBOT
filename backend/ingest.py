import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings  # Modernized
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader # Changed for PDF
from dotenv import load_dotenv

load_dotenv()

def create_vector_store():
    # 1. Load the Bhagavad Gita PDF
    # Make sure your file is named 'bhagavad_gita.pdf' in the data folder
    file_path = "../data/bhagavad_gita.pdf" 
    
    if not os.path.exists(file_path):
        print(f"❌ Error: Could not find {file_path}")
        return

    print("Loading PDF...")
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    
    # 2. Split documents into chunks
    # PDF pages can be large; 1000/100 is usually a good starting point for RAG
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n\n", "\n", " ", ""]
    )
    texts = text_splitter.split_documents(documents)
    
    print(f"✅ Created {len(texts)} text chunks")
    
    # 3. Create embeddings (Using the specialized HuggingFace package)
    print("Initializing embeddings...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
    
    # 4. Create and save vector store
    print("Building FAISS index (this may take a minute)...")
    vectorstore = FAISS.from_documents(texts, embeddings)
    vectorstore.save_local("faiss_index")
    
    print("🚀 Vector store created and saved successfully!")
    return vectorstore

if __name__ == "__main__":
    create_vector_store()