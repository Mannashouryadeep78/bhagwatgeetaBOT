import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

def ingest():
    print("Loading PDF...")
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "data", "bhagavad_gita.pdf")
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    print("Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    texts = text_splitter.split_documents(documents)

    print("Generating embeddings and creating FAISS index...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'}
    )
    
    vectorstore = FAISS.from_documents(texts, embeddings)

    print("Saving index...")
    index_path = os.path.join(os.path.dirname(__file__), "faiss_index")
    vectorstore.save_local(index_path)
    print(f"Success! FAISS index saved to {index_path}")

if __name__ == "__main__":
    ingest()
