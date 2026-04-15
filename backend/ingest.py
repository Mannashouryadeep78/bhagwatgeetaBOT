import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from dotenv import load_dotenv

load_dotenv()

# Paths relative to this file
BASE_DIR = os.path.dirname(__file__)
PDF_PATH = os.path.join(BASE_DIR, "..", "data", "bhagavad_gita.pdf")
FAISS_INDEX_PATH = os.path.join(BASE_DIR, "faiss_index")


def create_vector_store():
    if not os.path.exists(PDF_PATH):
        print(f"Error: Could not find PDF at {os.path.abspath(PDF_PATH)}")
        return

    print("Loading PDF...")
    loader = PyPDFLoader(PDF_PATH)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n\n", "\n", " ", ""]
    )
    texts = text_splitter.split_documents(documents)
    print(f"Created {len(texts)} text chunks")

    print("Initializing embeddings...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )

    print("Building FAISS index (this may take a minute)...")
    vectorstore = FAISS.from_documents(texts, embeddings)
    vectorstore.save_local(FAISS_INDEX_PATH)

    print(f"Vector store saved to {FAISS_INDEX_PATH}")
    return vectorstore


if __name__ == "__main__":
    create_vector_store()
